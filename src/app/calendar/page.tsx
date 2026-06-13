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
import { Carousel } from "./Carousel";
import { RegionSelect } from "./RegionSelect";

export const dynamic = "force-dynamic";
export const metadata = { title: "カレンダー" };

type SearchParams = { view?: string; date?: string; ex?: string; q?: string; region?: string; open?: string };

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
// ex = 除外カテゴリ（カンマ区切り）。デフォルトは全表示で、ここに入った分だけ隠す。
// open = 中分類を開いている大分類id（同時に開けるのは1つ＝アコーディオン）。
function hrefFor(opts: { view: CalView; date: Ymd; ex?: string | null; q?: string | null; region?: string | null; open?: string | null }) {
  const sp = new URLSearchParams();
  sp.set("view", opts.view);
  sp.set("date", paramFor(opts.date));
  if (opts.ex) sp.set("ex", opts.ex);
  if (opts.q) sp.set("q", opts.q);
  if (opts.region) sp.set("region", opts.region);
  if (opts.open) sp.set("open", opts.open);
  return `/calendar?${sp.toString()}`;
}

const occInclude = {
  event: { include: { venue: true, eventCategories: { select: { categoryId: true } } } },
} as const;

// 除外カテゴリ（中分類idの配列）から、イベント側の where 断片を作る。
// 「除外されていない分類を1つでも持つ」or「無分類」のイベントだけを残す＝除外方式。
function excludeEventWhere(excludeIds: string[]) {
  if (excludeIds.length === 0) return {};
  return {
    OR: [
      { eventCategories: { some: { categoryId: { notIn: excludeIds } } } },
      { eventCategories: { none: {} } },
    ],
  };
}

async function loadOccurrences(args: { start: Date; end: Date; excludeIds: string[]; q: string; regions: string[] }) {
  return prisma.eventOccurrence.findMany({
    where: {
      // 範囲内に開始する回 ＋ 範囲より前に始まり範囲にかかる会期もの（展覧会など）の両方を拾う
      OR: [
        { startsAt: { gte: args.start, lt: args.end } },
        { startsAt: { lt: args.start }, endsAt: { gte: args.start } },
      ],
      event: {
        status: "PUBLISHED",
        ...excludeEventWhere(args.excludeIds),
        ...(args.q ? { canonicalTitle: { contains: args.q, mode: "insensitive" as const } } : {}),
        ...(args.regions.length ? { venue: { region: { in: args.regions } } } : {}),
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
  const q = (sp.q ?? "").trim();
  // 除外方式：ex（除外した中分類id）/ region はカンマ区切りリスト。デフォルトは全表示。
  const ex = (sp.ex ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const exSet = new Set(ex);
  const regions = (sp.region ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const regionSet = new Set(regions);
  const exParam = ex.length ? ex.join(",") : null; // 現フィルタ維持用
  const regionParam = regions.length ? regions.join(",") : null;
  const openId = (sp.open ?? "").trim() || null; // 中分類を開いている大分類
  // リストに id を足し引きしてカンマ文字列（空なら null）を返す
  const toggleStr = (list: string[], id: string) => {
    const n = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    return n.length ? n.join(",") : null;
  };

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
  // 全カテゴリを表示（空でも出す）。イベントがある分類を先頭に寄せる。
  const isTopUsed = (t: { id: string; childIds: string[] }) =>
    usedCatIds.has(t.id) || t.childIds.some((id) => usedCatIds.has(id));
  const topCategories = allCategories
    .filter((c) => c.parentId === null)
    .map((top) => ({ ...top, childIds: allCategories.filter((c) => c.parentId === top.id).map((c) => c.id) }))
    .sort((a, b) => Number(isTopUsed(b)) - Number(isTopUsed(a)) || a.name.localeCompare(b.name, "ja"));

  function resolveColor(categoryId: string): string {
    let cur = catById.get(categoryId);
    while (cur && !cur.colorKey && cur.parentId) cur = catById.get(cur.parentId);
    return colorForKey(cur?.colorKey);
  }
  function eventColor(occ: Occ): string {
    const firstCat = occ.event.eventCategories[0]?.categoryId;
    return firstCat ? resolveColor(firstCat) : colorForKey(null);
  }

  type Top = (typeof topCategories)[number];
  // 大分類の状態：on=全部表示 / off=子が全部除外 / partial=一部だけ除外
  const topState = (t: Top): "on" | "off" | "partial" => {
    if (t.childIds.length === 0) return "on";
    const exCount = t.childIds.filter((id) => exSet.has(id)).length;
    if (exCount === 0) return "on";
    if (exCount === t.childIds.length) return "off";
    return "partial";
  };
  // 大分類トグル：offなら子を全部表示に戻す、そうでなければ子を全部除外する
  const toggleTopEx = (t: Top): string | null => {
    const next = new Set(exSet);
    if (topState(t) === "off") t.childIds.forEach((id) => next.delete(id));
    else t.childIds.forEach((id) => next.add(id));
    return next.size ? [...next].join(",") : null;
  };
  // 中分類を出す（イベントがある分類を先頭に寄せる）
  const subCatsOf = (t: Top) =>
    t.childIds
      .map((id) => catById.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => Number(usedCatIds.has(b.id)) - Number(usedCatIds.has(a.id)) || a.name.localeCompare(b.name, "ja"));
  const openTop = openId ? topCategories.find((t) => t.id === openId) ?? null : null;
  // 全表示⇄全非表示トグル用：全中分類idと「全部除外済みか」
  const allLeafIds = topCategories.flatMap((t) => t.childIds);
  const allExcluded = allLeafIds.length > 0 && allLeafIds.every((id) => exSet.has(id));

  const today = todayJst();
  const fromToday = jstMidnightUtc(today.y, today.m, today.d);

  // 検索／近日開催（今日以降）。終端は十分先の日付（Prismaが扱える範囲）。
  const farFuture = new Date("2100-01-01T00:00:00Z");
  const { start, end, days } = buildRange(view, anchor);

  // 検索・近日開催・表示範囲の取得は互いに独立なので並列実行（直列の往復を1波に）
  const [searchResults, upcomingRaw, occurrences] = await Promise.all([
    q ? loadOccurrences({ start: fromToday, end: farFuture, excludeIds: ex, q, regions }) : Promise.resolve([] as Occ[]),
    prisma.eventOccurrence.findMany({
      where: {
        ...activeOccurrenceFilter(),
        event: {
          status: "PUBLISHED",
          ...excludeEventWhere(ex),
          ...(regions.length ? { venue: { region: { in: regions } } } : {}),
        },
      },
      orderBy: { startsAt: "asc" },
      take: 300,
      include: occInclude,
    }),
    q ? Promise.resolve([] as Occ[]) : loadOccurrences({ start, end, excludeIds: ex, q, regions }),
  ]);
  // 近日開催はイベント単位で重複排除（大相撲など多数の開催回を1件に）
  const upcoming = dedupeByEvent(upcomingRaw, 6);
  // カテゴリ/地域で絞り込み中は、該当イベントを日付順の一覧で表示する
  const isFiltering = (ex.length > 0 || regions.length > 0) && !q;
  const filteredList = isFiltering ? dedupeByEvent(upcomingRaw, 200) : [];
  // 「直近のイベント」欄に出すリスト：絞り込み中は結果、通常は近日開催。
  const nearbyList = isFiltering ? filteredList : dedupeByEvent(upcomingRaw, 30);
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
  const backHref = hrefFor({ view, date: selected, ex: exParam, q, region: regionParam });
  const hasFilters = ex.length > 0 || regions.length > 0 || !!q;

  // 地域プルダウン＝「地域を追加」。未選択の都道府県だけを候補に、選ぶとリストに足す。
  const addRegionOptions = availableRegions
    .filter((rg) => !regionSet.has(rg))
    .map((rg) => ({
      label: rg,
      value: rg,
      href: hrefFor({ view, date: selected, ex: exParam, q, region: toggleStr(regions, rg), open: openId }),
    }));

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ツールバー：検索＋ビュー */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action="/calendar" method="get" className="relative w-full sm:max-w-md">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="date" value={paramFor(selected)} />
            {exParam && <input type="hidden" name="ex" value={exParam} />}
            {regionParam && <input type="hidden" name="region" value={regionParam} />}
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
                href={hrefFor({ view, date: selected, ex: exParam, q: null, region: regionParam, open: openId })}
                aria-label="検索をクリア"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-outline hover:bg-surface-variant/60"
              >
                <Icon name="close" className="text-[18px]" />
              </Link>
            )}
          </form>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 self-start sm:self-auto">
            {availableRegions.length > 0 && addRegionOptions.length > 0 && <RegionSelect options={addRegionOptions} />}
            {regions.map((rg) => (
              <Link
                key={rg}
                href={hrefFor({ view, date: selected, ex: exParam, q, region: toggleStr(regions, rg), open: openId })}
                scroll={false}
                className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary transition hover:bg-primary/15"
              >
                {rg}<Icon name="close" className="text-[14px]" />
              </Link>
            ))}
            <div className="inline-flex rounded-full bg-surface-variant/40 p-1 text-sm">
              {(["month", "week", "day"] as CalView[]).map((v) => {
                const label = v === "month" ? "月" : v === "week" ? "週" : "日";
                const isActive = v === view;
                return (
                  <Link
                    key={v}
                    href={hrefFor({ view: v, date: selected, ex: exParam, q, region: regionParam, open: openId })}
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
        </div>

        {/* カテゴリ（除外方式）。デフォルト全表示で、押すとそのカテゴリを隠す。
            各ピル左＝表示/非表示トグル、右の▾＝中分類を開く（同時に1つだけ）。*/}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* すべて表示 ⇄ すべて非表示。全部隠してから見たいものだけ戻す使い方ができる。*/}
          <Link
            href={hrefFor({ view, date: selected, ex: allExcluded ? null : allLeafIds.join(","), q, region: regionParam, open: openId })}
            scroll={false}
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              allExcluded
                ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                : "bg-on-surface text-surface shadow-sm hover:bg-on-surface/90"
            }`}
          >
            <Icon name={allExcluded ? "visibility" : "visibility_off"} className="text-[16px]" />
            {allExcluded ? "すべて表示" : "すべて非表示"}
          </Link>
          {topCategories.map((c) => {
            const state = topState(c);
            const color = colorForKey(c.colorKey);
            const isOpen = openId === c.id;
            return (
              <div key={c.id} className="inline-flex shrink-0 items-stretch overflow-hidden rounded-full">
                <TopToggle
                  href={hrefFor({ view, date: selected, ex: toggleTopEx(c), q, region: regionParam, open: openId })}
                  state={state}
                  color={color}
                >
                  {c.name}
                </TopToggle>
                <Link
                  href={hrefFor({ view, date: selected, ex: exParam, q, region: regionParam, open: isOpen ? null : c.id })}
                  scroll={false}
                  aria-label={`${c.name}の中分類`}
                  className={`grid w-7 place-items-center border-l transition ${
                    state === "off"
                      ? "border-black/5 bg-surface-variant/40 text-outline"
                      : "border-black/5 text-slate-700"
                  } ${isOpen ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"}`}
                  style={state === "off" ? undefined : { backgroundColor: `${color}26` }}
                >
                  <Icon name={isOpen ? "expand_less" : "expand_more"} className="text-[18px]" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* 中分類（開いている大分類の分だけ・1段のみ。押すと表示/非表示）*/}
        {openTop && (
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto rounded-2xl bg-surface-variant/30 px-4 py-2.5 lg:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-on-surface-variant">
              <Icon name="subdirectory_arrow_right" className="text-[16px]" />{openTop.name}
            </span>
            {subCatsOf(openTop).map((sc) => (
              <SubToggle
                key={sc.id}
                href={hrefFor({ view, date: selected, ex: toggleStr(ex, sc.id), q, region: regionParam, open: openId })}
                off={exSet.has(sc.id)}
                color={colorForKey(openTop.colorKey)}
              >
                {sc.name}
              </SubToggle>
            ))}
          </div>
        )}

        {/* 絞り込み中の一括解除（除外・地域・検索をすべてリセット）*/}
        {hasFilters && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Icon name="filter_alt" className="text-[16px]" />
            <span>{ex.length > 0 ? `${ex.length}カテゴリを非表示中` : "絞り込み中"}</span>
            <Link href={hrefFor({ view, date: selected })} className="inline-flex items-center gap-1 rounded-full bg-surface-variant/60 px-3 py-1 font-medium text-on-surface transition hover:bg-surface-variant">
              <Icon name="close" className="text-[14px]" />すべて表示に戻す
            </Link>
          </div>
        )}

        {/* 直近のイベント（カテゴリの下）。絞り込み中はこの欄が結果に切り替わる。*/}
        {!q && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface">
                直近のイベント
                {isFiltering && <span className="ml-1.5 text-sm font-normal text-outline">{nearbyList.length}件</span>}
              </h3>
              {!isFiltering && (
                <Link href="/explore" className="text-sm font-semibold text-primary hover:underline">もっと見る</Link>
              )}
            </div>
            {nearbyList.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-outline-variant/40 bg-white px-3 py-10 text-center text-sm text-outline">
                {isFiltering ? "この条件で開催予定のイベントはありません。" : "予定されているイベントはまだありません。"}
              </p>
            ) : (
              <Carousel>
                {nearbyList.map((occ) => (
                  <CarouselCard key={occ.id} occ={occ} resolveColor={resolveColor} catById={catById} from={backHref} />
                ))}
              </Carousel>
            )}
          </section>
        )}

        {q ? (
          <SearchResults q={q} results={searchResults} resolveColor={resolveColor} catById={catById} clearHref={hrefFor({ view, date: selected, ex: exParam, q: null, region: regionParam, open: openId })} from={backHref} />
        ) : view === "month" ? (
          <>
            {/* ダッシュボード：カレンダー＋選択日リスト */}
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              {/* カレンダーウィジェット */}
              <section className="rounded-2xl border border-outline-variant/30 bg-white p-3 shadow-sm sm:p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold text-on-surface">{anchor.y}年{anchor.m + 1}月</h2>
                  <div className="flex items-center gap-1">
                    <Link href={hrefFor({ view, date: shiftAnchor(view, anchor, -1), ex: exParam, q, region: regionParam, open: openId })} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-variant/50" aria-label="前の月"><Icon name="chevron_left" /></Link>
                    <Link href={hrefFor({ view, date: todayJst(), ex: exParam, q, region: regionParam, open: openId })} className="rounded-lg px-2 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-variant/50">今日</Link>
                    <Link href={hrefFor({ view, date: shiftAnchor(view, anchor, 1), ex: exParam, q, region: regionParam, open: openId })} className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant hover:bg-surface-variant/50" aria-label="次の月"><Icon name="chevron_right" /></Link>
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
                    if (exParam) params.set("ex", exParam);
                    if (regionParam) params.set("region", regionParam);
                    if (openId) params.set("open", openId);
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
                <div className="custom-scroll flex-1 space-y-3 overflow-y-auto">
                  {selectedEvents.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-outline-variant/40 px-3 py-10 text-center text-sm text-outline">この日のイベントはありません</p>
                  ) : (
                    selectedEvents.map((occ) => (
                      <DayPanelCard key={occ.id} occ={occ} resolveColor={resolveColor} catById={catById} from={backHref} dayKey={selectedKey} />
                    ))
                  )}
                </div>
                <Link href="/submit" className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-primary/10 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15">
                  <Icon name="add" className="text-[18px]" /> イベントを投稿
                </Link>
              </section>
            </div>
          </>
        ) : (
          <DayList days={days} byDay={byDay} todayKey={todayKey} resolveColor={resolveColor} catById={catById} from={backHref} />
        )}

        {/* 注目のイベント（カレンダーの下。テキスト検索中は出さない）*/}
        {!q && highlight && (
          <Highlight occ={highlight} color={eventColor(highlight)} catById={catById} from={backHref} />
        )}

      </div>
    </main>
  );
}

// 大分類の表示/非表示トグル（除外方式）。on=色付き / partial=薄い色＋「一部」/ off=グレー＋打ち消し線。
function TopToggle({ href, state, color, children }: { href: string; state: "on" | "off" | "partial"; color: string; children: React.ReactNode }) {
  const base = "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1.5 pl-3.5 pr-3 text-sm font-medium transition";
  if (state === "off") {
    return (
      <Link href={href} scroll={false} className={`${base} bg-surface-variant/40 text-outline line-through hover:bg-surface-variant/60`}>
        <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-current" />
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={`${base} text-slate-800 hover:brightness-[0.97]`}
      style={{ backgroundColor: state === "partial" ? `${color}26` : `${color}59` }}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
      {state === "partial" && <span className="rounded bg-white/70 px-1 text-[10px] font-semibold text-slate-500">一部</span>}
    </Link>
  );
}

// 中分類の表示/非表示トグル。off＝グレー＋打ち消し線、on＝色付き。
function SubToggle({ href, off, color, children }: { href: string; off: boolean; color: string; children: React.ReactNode }) {
  const base = "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition";
  if (off) {
    return (
      <Link href={href} scroll={false} className={`${base} bg-white/60 font-medium text-outline line-through hover:bg-white`}>
        {children}
      </Link>
    );
  }
  return (
    <Link href={href} scroll={false} className={`${base} font-medium text-slate-800 hover:brightness-[0.97]`} style={{ backgroundColor: `${color}40` }}>
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
    <Link
      href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`}
      className="group relative block overflow-hidden rounded-xl border border-black/5 bg-white p-3 pl-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} aria-hidden />
      <div className="mb-1.5 flex items-start justify-between gap-2">
        {cat ? (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-700" style={{ backgroundColor: `${color}26` }}>
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
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-on-surface-variant">
            {formatJstTime(occ.startsAt)}{occ.endsAt ? `–${formatJstTime(occ.endsAt)}` : ""}
          </span>
        )}
      </div>
      <h4 className="font-bold leading-snug text-on-surface transition-colors group-hover:text-primary">{occ.event.canonicalTitle}</h4>
      {occ.event.venue && (
        <div className="mt-1.5 flex items-center gap-1 text-on-surface-variant">
          <Icon name="location_on" className="text-[15px] text-outline" />
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

// 絞り込み結果カルーセル用カード（縦型・カテゴリ色のヘッダー）
function CarouselCard({ occ, resolveColor, catById, from }: { occ: Occ; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; from: string }) {
  const p = jstParts(occ.startsAt);
  const cat = occ.event.eventCategories[0];
  const color = cat ? resolveColor(cat.categoryId) : colorForKey(null);
  const ongoing = isOngoing(occ);
  const catName = cat ? (catById.get(cat.categoryId)?.name ?? "") : "";
  return (
    <Link
      href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`}
      className="group flex w-60 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2 px-4 py-3" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
        <div className="leading-none text-slate-900/80">
          {ongoing ? (
            <div className="text-base font-bold">開催中</div>
          ) : (
            <>
              <div className="text-2xl font-bold">{p.m + 1}/{p.d}</div>
              <div className="mt-1 text-[10px] font-bold tracking-widest opacity-80">{p.y}年</div>
            </>
          )}
        </div>
        {catName && (
          <span className="shrink-0 rounded-full bg-white/40 px-2 py-0.5 text-[10px] font-bold text-slate-900/80 backdrop-blur-sm">{catName}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h4 className="line-clamp-2 font-bold leading-snug text-on-surface group-hover:text-primary">{occ.event.canonicalTitle}</h4>
        <p className="mt-auto flex items-center gap-1 text-xs text-on-surface-variant">
          <Icon name="schedule" className="text-[14px]" />
          {ongoing ? `〜${endLabel(occ.endsAt)} まで` : formatJstTime(occ.startsAt)}
        </p>
        {occ.event.venue && (
          <p className="flex items-center gap-1 text-xs text-outline">
            <Icon name="location_on" className="text-[14px]" />
            <span className="truncate">{occ.event.venue.name}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

// 近日開催カード（左に日付ボックス）
function UpcomingCard({ occ, resolveColor, catById, from }: { occ: Occ; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; from: string }) {
  const p = jstParts(occ.startsAt);
  const cat = occ.event.eventCategories[0];
  const color = cat ? resolveColor(cat.categoryId) : colorForKey(null);
  const ongoing = isOngoing(occ);
  return (
    <Link href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`} className="group flex items-center gap-3.5 rounded-2xl border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl" style={{ backgroundColor: `${color}26` }}>
        {ongoing ? (
          <span className="text-center text-[11px] font-bold leading-tight text-slate-700">開催<br />中</span>
        ) : (
          <>
            <span className="text-2xl font-bold leading-none text-slate-800">{p.d}</span>
            <span className="mt-0.5 text-[10px] font-bold tracking-widest text-slate-500">{p.m + 1}月</span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {cat && (
          <span className="mb-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold text-slate-700" style={{ backgroundColor: `${color}26` }}>
            {catById.get(cat.categoryId)?.name ?? ""}
          </span>
        )}
        <h4 className="truncate font-bold text-on-surface transition-colors group-hover:text-primary">{occ.event.canonicalTitle}</h4>
        <div className="mt-0.5 flex items-center gap-3 text-on-surface-variant">
          <span className="flex items-center gap-1 text-xs tabular-nums"><Icon name="schedule" className="text-[15px] text-outline" />{ongoing ? `${endLabel(occ.endsAt)} まで` : formatJstTime(occ.startsAt)}</span>
          {occ.event.venue && <span className="flex items-center gap-1 truncate text-xs"><Icon name="location_on" className="text-[15px] text-outline" />{occ.event.venue.name}</span>}
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
