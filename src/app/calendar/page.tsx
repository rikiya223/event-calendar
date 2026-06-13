import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { colorForKey } from "@/lib/categoryColors";
import { Icon } from "@/components/Icon";
import {
  type CalView,
  type Ymd,
  buildRange,
  shiftAnchor,
  parseDateParam,
  todayJst,
  addDays,
  ymdKey,
  jstDayKey,
  jstParts,
  jstMidnightUtc,
  occurrenceDayKeys,
  formatJstTime,
  formatJstDateLong,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { activeOccurrenceFilter, isOngoing, endLabel, dedupeByEvent } from "@/lib/eventStatus";

export const dynamic = "force-dynamic";
export const metadata = { title: "カレンダー" };

type SearchParams = { view?: string; date?: string; cat?: string; q?: string; region?: string };

function normView(v?: string): CalView {
  return v === "week" || v === "day" ? v : "month";
}
function normalizeYmd(ymd: Ymd): Ymd {
  const p = jstParts(jstMidnightUtc(ymd.y, ymd.m, ymd.d));
  return { y: p.y, m: p.m, d: p.d };
}
function paramFor(ymd: Ymd): string {
  return ymdKey(normalizeYmd(ymd));
}
function hrefFor(opts: { view: CalView; date: Ymd; cat?: string | null; q?: string | null; region?: string | null }) {
  const sp = new URLSearchParams();
  sp.set("view", opts.view);
  sp.set("date", paramFor(opts.date));
  if (opts.cat) sp.set("cat", opts.cat);
  if (opts.q) sp.set("q", opts.q);
  if (opts.region) sp.set("region", opts.region);
  return `/calendar?${sp.toString()}`;
}

const occInclude = {
  event: { include: { venue: true, eventCategories: { select: { categoryId: true } } } },
} as const;

async function loadOccurrences(args: { start: Date; end: Date; catScopeIds: string[] | null; q: string; region: string | null }) {
  return prisma.eventOccurrence.findMany({
    where: {
      // 範囲内に開始する回 ＋ 範囲より前に始まり範囲にかかる会期もの（展覧会など）の両方を拾う
      OR: [
        { startsAt: { gte: args.start, lt: args.end } },
        { startsAt: { lt: args.start }, endsAt: { gte: args.start } },
      ],
      event: {
        status: "PUBLISHED",
        ...(args.catScopeIds ? { eventCategories: { some: { categoryId: { in: args.catScopeIds } } } } : {}),
        ...(args.q ? { canonicalTitle: { contains: args.q, mode: "insensitive" as const } } : {}),
        ...(args.region ? { venue: { region: args.region } } : {}),
      },
    },
    orderBy: { startsAt: "asc" },
    include: occInclude,
  });
}
type Occ = Awaited<ReturnType<typeof loadOccurrences>>[number];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const view = normView(sp.view);
  const selected = parseDateParam(sp.date);
  const anchor = view === "month" ? { ...selected, d: 1 } : selected;
  const activeCat = sp.cat ?? null;
  const q = (sp.q ?? "").trim();
  const region = sp.region ?? null;

  // クイック期間フィルタ（今日／今週末／今月／来月）。カテゴリ・地域は引き継ぐ。
  const todayYmd = todayJst();
  const todayUtc = jstMidnightUtc(todayYmd.y, todayYmd.m, todayYmd.d);
  const sat = jstParts(addDays(todayUtc, (6 - jstParts(todayUtc).weekday + 7) % 7)); // 直近の土曜
  const weekendYmd = { y: sat.y, m: sat.m, d: sat.d };
  const thisMonthYmd = { y: todayYmd.y, m: todayYmd.m, d: 1 };
  const nm = jstParts(jstMidnightUtc(todayYmd.y, todayYmd.m + 1, 1));
  const nextMonthYmd = { y: nm.y, m: nm.m, d: 1 };
  const weekStartKey = (ymd: Ymd) => {
    const u = jstMidnightUtc(ymd.y, ymd.m, ymd.d);
    return jstDayKey(addDays(u, -jstParts(u).weekday));
  };
  const quickFilters = [
    { label: "今日", active: view === "day" && paramFor(selected) === paramFor(todayYmd), href: hrefFor({ view: "day", date: todayYmd, cat: activeCat, region }) },
    { label: "今週末", active: view === "week" && weekStartKey(selected) === weekStartKey(weekendYmd), href: hrefFor({ view: "week", date: weekendYmd, cat: activeCat, region }) },
    { label: "今月", active: view === "month" && selected.y === thisMonthYmd.y && selected.m === thisMonthYmd.m, href: hrefFor({ view: "month", date: thisMonthYmd, cat: activeCat, region }) },
    { label: "来月", active: view === "month" && selected.y === nextMonthYmd.y && selected.m === nextMonthYmd.m, href: hrefFor({ view: "month", date: nextMonthYmd, cat: activeCat, region }) },
  ];

  // 都道府県候補・カテゴリ・カテゴリ使用状況は互いに独立なので並列取得（DB往復を1波に）
  const [regionRows, allCategories, usedCatRows] = await Promise.all([
    prisma.venue.findMany({
      where: { region: { not: null }, events: { some: { status: "PUBLISHED" } } },
      distinct: ["region"],
      select: { region: true },
      orderBy: { region: "asc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, icon: true, colorKey: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.eventCategory.findMany({
      where: { event: { status: "PUBLISHED" } },
      select: { categoryId: true },
      distinct: ["categoryId"],
    }),
  ]);
  const availableRegions = regionRows.map((r) => r.region!).filter(Boolean);
  const catById = new Map(allCategories.map((c) => [c.id, c]));
  // 実際にイベントが付いているカテゴリだけを絞り込み候補に出す（空カテゴリは非表示）
  const usedCatIds = new Set(usedCatRows.map((r) => r.categoryId));
  const allTopCategories = allCategories
    .filter((c) => c.parentId === null)
    .map((top) => ({ ...top, childIds: allCategories.filter((c) => c.parentId === top.id).map((c) => c.id) }));
  // 大分類：自身か子のどれかにイベントがあるものだけ表示
  const topCategories = allTopCategories.filter(
    (t) => usedCatIds.has(t.id) || t.childIds.some((id) => usedCatIds.has(id)),
  );

  function resolveColor(categoryId: string): string {
    let cur = catById.get(categoryId);
    while (cur && !cur.colorKey && cur.parentId) cur = catById.get(cur.parentId);
    return colorForKey(cur?.colorKey);
  }
  function eventColor(occ: Occ): string {
    const firstCat = occ.event.eventCategories[0]?.categoryId;
    return firstCat ? resolveColor(firstCat) : colorForKey(null);
  }

  const selectedTop = activeCat ? topCategories.find((t) => t.id === activeCat) : null;
  const catScopeIds = selectedTop ? [selectedTop.id, ...selectedTop.childIds] : activeCat ? [activeCat] : null;

  // ドリルダウン：選択中の大分類（子を選んでいれば親）と、その子分類の絞り込み候補
  const activeCatObj = activeCat ? catById.get(activeCat) : null;
  const activeTopId = activeCatObj ? (activeCatObj.parentId ?? activeCatObj.id) : null;
  const activeTop = activeTopId ? topCategories.find((t) => t.id === activeTopId) : null;
  const activeChildId = activeCatObj?.parentId ? activeCat : null;
  // 中分類はイベントがあるものだけ表示
  const subCategories = activeTop
    ? activeTop.childIds.map((id) => catById.get(id)).filter((c) => c && usedCatIds.has(c.id))
    : [];

  const today = todayJst();
  const fromToday = jstMidnightUtc(today.y, today.m, today.d);

  // 検索／近日開催（今日以降）。終端は十分先の日付（Prismaが扱える範囲）。
  const farFuture = new Date("2100-01-01T00:00:00Z");
  const { start, end, days } = buildRange(view, anchor);

  // 検索・近日開催・表示範囲の取得は互いに独立なので並列実行（直列の往復を1波に）
  const [searchResults, upcomingRaw, occurrences] = await Promise.all([
    q ? loadOccurrences({ start: fromToday, end: farFuture, catScopeIds, q, region }) : Promise.resolve([] as Occ[]),
    prisma.eventOccurrence.findMany({
      where: {
        ...activeOccurrenceFilter(),
        event: {
          status: "PUBLISHED",
          ...(catScopeIds ? { eventCategories: { some: { categoryId: { in: catScopeIds } } } } : {}),
          ...(region ? { venue: { region } } : {}),
        },
      },
      orderBy: { startsAt: "asc" },
      take: 40,
      include: occInclude,
    }),
    q ? Promise.resolve([] as Occ[]) : loadOccurrences({ start, end, catScopeIds, q, region }),
  ]);
  // 近日開催はイベント単位で重複排除（大相撲など多数の開催回を1件に）
  const upcoming = dedupeByEvent(upcomingRaw, 6);
  const byDay = new Map<string, Occ[]>();
  for (const occ of occurrences) {
    // 会期もの（複数日）は期間中の各日に乗せる。単日は開始日のみ。
    for (const key of occurrenceDayKeys(occ.startsAt, occ.endsAt, start, end)) {
      (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(occ);
    }
  }
  // 各日の並び：その日に始まる回を時刻順で先に、会期中（継続）の回を後にまとめる
  for (const [key, list] of byDay) {
    list.sort((a, b) => {
      const aStarts = jstDayKey(a.startsAt) === key;
      const bStarts = jstDayKey(b.startsAt) === key;
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      if (aStarts) return a.startsAt.getTime() - b.startsAt.getTime();
      return a.event.canonicalTitle.localeCompare(b.event.canonicalTitle, "ja");
    });
  }

  const todayKey = ymdKey(todayJst());
  const selectedKey = paramFor(selected);
  const selectedEvents = byDay.get(selectedKey) ?? [];
  const highlight = upcoming[0];

  // イベント詳細から戻ったときに現在の絞り込みを復元するための from
  const backHref = hrefFor({ view, date: selected, cat: activeCat, q, region });
  const hasFilters = !!activeCat || !!region || !!q;

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ツールバー：検索＋ビュー */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action="/calendar" method="get" className="relative w-full sm:max-w-md">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="date" value={paramFor(selected)} />
            {activeCat && <input type="hidden" name="cat" value={activeCat} />}
            {region && <input type="hidden" name="region" value={region} />}
            <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="イベントを検索"
              className="h-11 w-full rounded-full border-none bg-surface-container pl-11 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {q && (
              <Link
                href={hrefFor({ view, date: selected, cat: activeCat, q: null, region })}
                aria-label="検索をクリア"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-outline hover:bg-surface-variant/60"
              >
                <Icon name="close" className="text-[18px]" />
              </Link>
            )}
          </form>
          <div className="inline-flex shrink-0 self-start rounded-full bg-surface-variant/40 p-1 text-sm sm:self-auto">
            {(["month", "week", "day"] as CalView[]).map((v) => {
              const label = v === "month" ? "月" : v === "week" ? "週" : "日";
              const isActive = v === view;
              return (
                <Link
                  key={v}
                  href={hrefFor({ view: v, date: selected, cat: activeCat, q, region })}
                  className={`rounded-full px-4 py-1.5 font-medium transition ${
                    isActive ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* クイック期間フィルタ */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-on-surface-variant">
            <Icon name="bolt" className="text-[16px]" />期間
          </span>
          {quickFilters.map((f) => (
            <Pill key={f.label} href={f.href} active={f.active}>{f.label}</Pill>
          ))}
        </div>

        {/* カテゴリピル（大分類） */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Pill href={hrefFor({ view, date: selected, cat: null, q, region })} active={!activeCat}>すべて</Pill>
          {topCategories.map((c) => {
            const isActive = activeTopId === c.id;
            const color = colorForKey(c.colorKey);
            return (
              <Pill key={c.id} href={hrefFor({ view, date: selected, cat: activeCat === c.id ? null : c.id, q, region })} active={isActive} color={color}>
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {c.name}
              </Pill>
            );
          })}
        </div>

        {/* 中分類ピル（大分類を選ぶと出る：さらに絞り込み） */}
        {activeTop && subCategories.length > 0 && (
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-on-surface-variant">
              <Icon name="subdirectory_arrow_right" className="text-[16px]" />{activeTop.name}
            </span>
            <Pill href={hrefFor({ view, date: selected, cat: activeTop.id, q, region })} active={!activeChildId}>すべて</Pill>
            {subCategories.map((sc) => (
              <Pill
                key={sc!.id}
                href={hrefFor({ view, date: selected, cat: activeChildId === sc!.id ? activeTop.id : sc!.id, q, region })}
                active={activeChildId === sc!.id}
                color={colorForKey(activeTop.colorKey)}
              >
                {sc!.name}
              </Pill>
            ))}
          </div>
        )}

        {/* 地域フィルター（イベントのある都道府県のみ） */}
        {availableRegions.length > 0 && (
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-on-surface-variant">
              <Icon name="location_on" className="text-[16px]" />地域
            </span>
            <Pill href={hrefFor({ view, date: selected, cat: activeCat, q, region: null })} active={!region}>全国</Pill>
            {availableRegions.map((rg) => (
              <Pill key={rg} href={hrefFor({ view, date: selected, cat: activeCat, q, region: region === rg ? null : rg })} active={region === rg}>
                {rg}
              </Pill>
            ))}
          </div>
        )}

        {/* 絞り込み中の一括解除 */}
        {hasFilters && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Icon name="filter_alt" className="text-[16px]" />
            <span>絞り込み中</span>
            <Link href={hrefFor({ view, date: selected })} className="inline-flex items-center gap-1 rounded-full bg-surface-variant/60 px-3 py-1 font-medium text-on-surface transition hover:bg-surface-variant">
              <Icon name="close" className="text-[14px]" />すべて解除
            </Link>
          </div>
        )}

        {q ? (
          <SearchResults q={q} results={searchResults} resolveColor={resolveColor} catById={catById} clearHref={hrefFor({ view, date: selected, cat: activeCat, q: null, region })} from={backHref} />
        ) : view === "month" ? (
          <>
            {/* ダッシュボード：カレンダー＋選択日リスト */}
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              {/* カレンダーウィジェット */}
              <section className="rounded-2xl border border-outline-variant/30 bg-white p-3 shadow-sm sm:p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold text-on-surface">{anchor.y}年{anchor.m + 1}月</h2>
                  <div className="flex items-center gap-1">
                    <Link href={hrefFor({ view, date: shiftAnchor(view, anchor, -1), cat: activeCat, q, region })} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-variant/50" aria-label="前の月"><Icon name="chevron_left" /></Link>
                    <Link href={hrefFor({ view, date: todayJst(), cat: activeCat, q, region })} className="rounded-lg px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-variant/50">今日</Link>
                    <Link href={hrefFor({ view, date: shiftAnchor(view, anchor, 1), cat: activeCat, q, region })} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-variant/50" aria-label="次の月"><Icon name="chevron_right" /></Link>
                  </div>
                </div>
                <div className="grid grid-cols-7 border-t border-outline-variant/20">
                  {WEEKDAY_LABELS.map((w, i) => (
                    <div key={w} className={`py-2.5 text-center text-[11px] font-semibold ${i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-outline"}`}>{w}</div>
                  ))}
                  {days.map((day) => {
                    const p = jstParts(day);
                    const key = ymdKey({ y: p.y, m: p.m, d: p.d });
                    const list = byDay.get(key) ?? [];
                    const inMonth = p.m === anchor.m;
                    const isToday = key === todayKey;
                    const isSelected = key === selectedKey;
                    const params = new URLSearchParams({ view: "month", date: key });
                    if (activeCat) params.set("cat", activeCat);
                    if (region) params.set("region", region);
                    return (
                      <Link
                        key={key}
                        href={`/calendar?${params.toString()}`}
                        className={`relative flex h-14 flex-col gap-1 border-b border-r border-outline-variant/10 p-1.5 transition sm:h-[88px] ${
                          isSelected ? "z-10 rounded-lg bg-primary-container/15 ring-2 ring-inset ring-primary" : "hover:bg-surface-variant/40"
                        } ${inMonth ? "" : "opacity-30"}`}
                      >
                        {/* 今日＝塗りつぶしの円、選択日＝セルの枠で区別 */}
                        <span
                          className={`grid h-5 w-5 place-items-center rounded-full text-xs ${
                            isToday
                              ? "bg-primary font-bold text-white"
                              : isSelected
                                ? "font-bold text-primary"
                                : p.weekday === 0
                                  ? "text-rose-500"
                                  : p.weekday === 6
                                    ? "text-sky-500"
                                    : "text-on-surface-variant"
                          }`}
                        >
                          {p.d}
                        </span>
                        {list.length > 0 && (
                          <>
                            {/* モバイル：色ドット */}
                            <div className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                              {list.slice(0, 3).map((occ) => (
                                <span key={occ.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: eventColor(occ) }} />
                              ))}
                              {list.length > 3 && <span className="text-[9px] leading-none text-outline">+{list.length - 3}</span>}
                            </div>
                            {/* PC：イベント名 */}
                            <div className="mt-0.5 hidden flex-col gap-0.5 sm:flex">
                              {list.slice(0, 2).map((occ) => (
                                <span
                                  key={occ.id}
                                  className="truncate rounded px-1 text-[10px] leading-tight text-on-surface-variant"
                                  style={{ backgroundColor: `${eventColor(occ)}30` }}
                                >
                                  {occ.event.canonicalTitle}
                                </span>
                              ))}
                              {list.length > 2 && <span className="px-1 text-[9px] leading-none text-outline">+{list.length - 2}件</span>}
                            </div>
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* 選択日のイベント */}
              <section className="flex flex-col rounded-2xl border border-outline-variant/30 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">{selected.m + 1}月{selected.d}日のイベント</h3>
                  <span className="text-sm text-outline">{selectedEvents.length}件</span>
                </div>
                <div className="custom-scroll flex-1 space-y-3 overflow-y-auto lg:max-h-[360px]">
                  {selectedEvents.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-outline-variant/40 px-3 py-10 text-center text-sm text-outline">この日のイベントはありません</p>
                  ) : (
                    selectedEvents.map((occ) => (
                      <DayPanelCard key={occ.id} occ={occ} resolveColor={resolveColor} catById={catById} from={backHref} dayKey={selectedKey} />
                    ))
                  )}
                </div>
                <Link href="/submit" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white transition hover:opacity-90">
                  <Icon name="add" className="text-[20px]" /> イベントを投稿
                </Link>
              </section>
            </div>

            {/* 特集ハイライト */}
            {highlight && <Highlight occ={highlight} color={eventColor(highlight)} catById={catById} from={backHref} />}

            {/* 近日開催 */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-on-surface">近日開催のイベント</h3>
                <Link href="/explore" className="text-sm font-semibold text-primary hover:underline">もっと見る</Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-outline-variant/40 bg-white px-3 py-10 text-center text-sm text-outline">予定されているイベントはまだありません。</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((occ) => (
                    <UpcomingCard key={occ.id} occ={occ} resolveColor={resolveColor} catById={catById} from={backHref} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <DayList days={days} byDay={byDay} todayKey={todayKey} resolveColor={resolveColor} catById={catById} from={backHref} />
        )}
      </div>
    </main>
  );
}

function Pill({ href, active, color, children }: { href: string; active: boolean; color?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm shadow-sm transition ${
        active ? "border-on-surface font-medium text-on-surface" : "border-outline-variant/40 bg-white text-on-surface-variant hover:bg-surface-variant/40"
      }`}
      style={active && color ? { backgroundColor: `${color}40` } : undefined}
    >
      {children}
    </Link>
  );
}

// 選択日リストのカード（モックアップ調）
function DayPanelCard({ occ, resolveColor, catById, from, dayKey }: { occ: Occ; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; from: string; dayKey?: string }) {
  const cat = occ.event.eventCategories[0];
  const color = cat ? resolveColor(cat.categoryId) : colorForKey(null);
  // 会期もの（複数日）かどうか。継続日は「会期中」、初日は「初日」と表示する。
  const startKey = jstDayKey(occ.startsAt);
  const multiDay = !!occ.endsAt && jstDayKey(occ.endsAt) !== startKey;
  const ongoing = multiDay && !!dayKey && dayKey !== startKey;
  const endLabel = occ.endsAt ? `${jstParts(occ.endsAt).m + 1}/${jstParts(occ.endsAt).d}` : "";
  return (
    <Link href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`} className="group block rounded-xl border border-outline-variant/10 bg-surface-container-low p-3 transition hover:border-primary/50">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        {cat ? (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-on-surface-variant" style={{ backgroundColor: `${color}26` }}>
            {catById.get(cat.categoryId)?.name ?? ""}
          </span>
        ) : <span />}
        {multiDay ? (
          ongoing ? (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">会期中 〜{endLabel}</span>
          ) : (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">初日 〜{endLabel}</span>
          )
        ) : (
          <span className="shrink-0 text-[11px] font-medium text-on-surface-variant">
            {formatJstTime(occ.startsAt)}{occ.endsAt ? `–${formatJstTime(occ.endsAt)}` : ""}
          </span>
        )}
      </div>
      <h4 className="font-bold leading-snug text-on-surface transition-colors group-hover:text-primary">{occ.event.canonicalTitle}</h4>
      {occ.event.venue && (
        <div className="mt-1.5 flex items-center gap-1 text-on-surface-variant">
          <Icon name="location_on" className="text-[16px]" />
          <span className="truncate text-xs">{occ.event.venue.name}</span>
        </div>
      )}
    </Link>
  );
}

// 特集ハイライト（画像の代わりにカテゴリ色のグラデーション）
function Highlight({ occ, color, catById, from }: { occ: Occ; color: string; catById: Map<string, { name: string }>; from: string }) {
  const p = jstParts(occ.startsAt);
  return (
    <section>
      <h3 className="mb-3 text-lg font-bold text-on-surface">注目のイベント</h3>
      <Link href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`} className="group relative block h-52 overflow-hidden rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${color}, #004ac6)` }}>
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex flex-col justify-end gap-2 p-6 text-white">
          <div className="flex flex-wrap gap-2">
            {occ.event.eventCategories.slice(0, 2).map((ec) => (
              <span key={ec.categoryId} className="rounded-full bg-white/25 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">{catById.get(ec.categoryId)?.name ?? ""}</span>
            ))}
          </div>
          <h2 className="text-2xl font-bold leading-tight">{occ.event.canonicalTitle}</h2>
          <p className="text-sm text-white/85">{p.y}年{p.m + 1}月{p.d}日{occ.event.venue ? ` ・ ${occ.event.venue.name}` : ""}</p>
        </div>
        <span className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary transition group-hover:bg-white">
          <Icon name="arrow_forward" />
        </span>
      </Link>
    </section>
  );
}

// 近日開催カード（左に日付ボックス）
function UpcomingCard({ occ, resolveColor, catById, from }: { occ: Occ; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; from: string }) {
  const p = jstParts(occ.startsAt);
  const cat = occ.event.eventCategories[0];
  const color = cat ? resolveColor(cat.categoryId) : colorForKey(null);
  const ongoing = isOngoing(occ);
  return (
    <Link href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`} className="group flex items-center gap-4 rounded-2xl border border-outline-variant/30 bg-white p-3 transition hover:border-primary/30 hover:shadow-md">
      {ongoing ? (
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
          <span className="text-center text-[12px] font-bold leading-tight text-amber-600">開催<br />中</span>
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-container-high transition group-hover:bg-primary-fixed-dim">
          <span className="text-xl font-bold leading-none text-primary">{p.d}</span>
          <span className="mt-1 text-[10px] font-bold tracking-widest text-outline group-hover:text-primary">{p.m + 1}月</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        {cat && (
          <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-on-surface-variant" style={{ backgroundColor: `${color}26` }}>
            {catById.get(cat.categoryId)?.name ?? ""}
          </span>
        )}
        <h4 className="truncate font-bold text-on-surface transition-colors group-hover:text-primary">{occ.event.canonicalTitle}</h4>
        <div className="mt-0.5 flex items-center gap-3 text-on-surface-variant">
          <span className="flex items-center gap-1 text-xs"><Icon name="schedule" className="text-[15px]" />{ongoing ? `${endLabel(occ.endsAt)} まで` : formatJstTime(occ.startsAt)}</span>
          {occ.event.venue && <span className="flex items-center gap-1 truncate text-xs"><Icon name="location_on" className="text-[15px]" />{occ.event.venue.name}</span>}
        </div>
      </div>
    </Link>
  );
}

// 週・日ビュー
function DayList({ days, byDay, todayKey, resolveColor, catById, from }: { days: Date[]; byDay: Map<string, Occ[]>; todayKey: string; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; from: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => {
        const p = jstParts(day);
        const key = ymdKey({ y: p.y, m: p.m, d: p.d });
        const list = byDay.get(key) ?? [];
        const isToday = key === todayKey;
        return (
          <section key={key} className="rounded-2xl border border-outline-variant/30 bg-white p-4 shadow-sm">
            <h2 className={`mb-2 flex items-center gap-2 text-sm font-bold ${isToday ? "text-primary" : "text-on-surface"}`}>
              <span className={p.weekday === 0 ? "text-rose-500" : p.weekday === 6 ? "text-sky-500" : ""}>{p.m + 1}/{p.d}（{WEEKDAY_LABELS[p.weekday]}）</span>
              {isToday && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">今日</span>}
            </h2>
            {list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-outline-variant/40 px-3 py-4 text-center text-xs text-outline">予定なし</p>
            ) : (
              <div className="space-y-2.5">
                {list.map((occ) => (
                  <DayPanelCard key={occ.id} occ={occ} resolveColor={resolveColor} catById={catById} from={from} dayKey={key} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// 検索結果
function SearchResults({ q, results, resolveColor, catById, clearHref, from }: { q: string; results: Occ[]; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; clearHref: string; from: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm text-on-surface-variant">
        「{q}」の検索結果（今日以降・{results.length}件）
        <Link href={clearHref} className="ml-2 text-primary hover:underline">クリア</Link>
      </h2>
      {results.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-outline-variant/40 bg-white px-3 py-12 text-center text-sm text-outline">該当するイベントが見つかりませんでした。</p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-3">
          {results.map((occ) => (
            <UpcomingCard key={occ.id} occ={occ} resolveColor={resolveColor} catById={catById} from={from} />
          ))}
        </div>
      )}
    </section>
  );
}
