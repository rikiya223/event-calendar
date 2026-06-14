"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { colorForKey } from "@/lib/categoryColors";
import { Icon } from "@/components/Icon";
import { saveCalendarFilter } from "./actions";
import {
  type CalView,
  type Ymd,
  buildRange,
  shiftAnchor,
  todayJst,
  ymdKey,
  jstParts,
  jstMidnightUtc,
  occurrenceDayKeys,
  jstDayKey,
  formatJstTime,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import { isOngoing, endLabel, dedupeByEvent } from "@/lib/eventStatus";
import { Carousel } from "./Carousel";
import { RegionSelect } from "./RegionSelect";

// サーバから渡る開催回（occInclude と構造を合わせる）。Date は RSC で復元される。
type Occ = {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  event: {
    id: string;
    canonicalTitle: string;
    venue: { name: string; region: string | null } | null;
    eventCategories: { categoryId: string }[];
    _count: { bookmarks: number };
  };
};
type Cat = { id: string; name: string; icon: string | null; colorKey: string | null; parentId: string | null };

function normalizeYmd(ymd: Ymd): Ymd {
  const p = jstParts(jstMidnightUtc(ymd.y, ymd.m, ymd.d));
  return { y: p.y, m: p.m, d: p.d };
}
function paramFor(ymd: Ymd): string {
  return ymdKey(normalizeYmd(ymd));
}
// ex = 除外カテゴリ、open = 中分類を開いている大分類id（同時に1つ）。
function hrefFor(opts: { view: CalView; date: Ymd; ex?: string | null; q?: string | null; region?: string | null; open?: string | null }) {
  const sp = new URLSearchParams();
  sp.set("view", opts.view);
  sp.set("date", paramFor(opts.date));
  // ex は空文字 "" も明示（保存設定の既定を上書きして「全表示」にするため）。null/undefined のみ省略。
  if (opts.ex != null) sp.set("ex", opts.ex);
  if (opts.q) sp.set("q", opts.q);
  if (opts.region) sp.set("region", opts.region);
  if (opts.open) sp.set("open", opts.open);
  return `/calendar?${sp.toString()}`;
}

export function CalendarBoard({
  view,
  selected,
  q,
  selectedRegions,
  availableRegions,
  categories,
  usedCatIds,
  occurrences,
  upcomingRaw,
  searchResults,
  initialEx,
  initialOpen,
  canSave,
  savedEx,
}: {
  view: CalView;
  selected: Ymd;
  q: string;
  selectedRegions: string[];
  availableRegions: string[];
  categories: Cat[];
  usedCatIds: string[];
  occurrences: Occ[];
  upcomingRaw: Occ[];
  searchResults: Occ[];
  initialEx: string[];
  initialOpen: string | null;
  canSave: boolean;
  savedEx: string[] | null;
}) {
  // カテゴリ除外と中分類の開閉だけをクライアント状態に持つ（＝サーバ往復なしで即時反映）。
  // view / date / q / region の変更はこれまで通りナビゲーション（サーバ再取得）。
  const [ex, setEx] = useState<string[]>(initialEx);
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const [savePending, startSave] = useTransition();
  const router = useRouter();

  const regions = selectedRegions;
  const regionSet = new Set(regions);
  const exSet = useMemo(() => new Set(ex), [ex]);
  // 保存設定がある人は、空でも "ex=" を明示してURLに残す（ナビゲーション先で既定が再適用されるのを防ぐ）。
  const exParam = ex.length ? ex.join(",") : savedEx !== null ? "" : null;
  const regionParam = regions.length ? regions.join(",") : null;
  // 現在の絞り込みが保存済みの内容と同じか
  const isSavedState = savedEx !== null && [...ex].sort().join(",") === [...savedEx].sort().join(",");
  const usedCatSet = useMemo(() => new Set(usedCatIds), [usedCatIds]);

  const anchor = view === "month" ? { ...selected, d: 1 } : selected;

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const isTopUsed = (t: { id: string; childIds: string[] }) => usedCatSet.has(t.id) || t.childIds.some((id) => usedCatSet.has(id));
  const topCategories = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === null)
        .map((top) => ({ ...top, childIds: categories.filter((c) => c.parentId === top.id).map((c) => c.id) }))
        .sort((a, b) => Number(isTopUsed(b)) - Number(isTopUsed(a)) || a.name.localeCompare(b.name, "ja")),
    [categories, usedCatSet],
  );
  type Top = (typeof topCategories)[number];

  const resolveColor = (categoryId: string): string => {
    let cur = catById.get(categoryId);
    while (cur && !cur.colorKey && cur.parentId) cur = catById.get(cur.parentId);
    return colorForKey(cur?.colorKey);
  };
  const eventColor = (occ: Occ): string => {
    const firstCat = occ.event.eventCategories[0]?.categoryId;
    return firstCat ? resolveColor(firstCat) : colorForKey(null);
  };

  // ── カテゴリ除外の状態・操作 ───────────────────────────────
  const topState = (t: Top): "on" | "off" | "partial" => {
    if (t.childIds.length === 0) return "on";
    const exCount = t.childIds.filter((id) => exSet.has(id)).length;
    if (exCount === 0) return "on";
    if (exCount === t.childIds.length) return "off";
    return "partial";
  };
  const allLeafIds = topCategories.flatMap((t) => t.childIds);
  const allExcluded = allLeafIds.length > 0 && allLeafIds.every((id) => exSet.has(id));
  const openTop = openId ? topCategories.find((t) => t.id === openId) ?? null : null;
  const subCatsOf = (t: Top) =>
    t.childIds
      .map((id) => catById.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => Number(usedCatSet.has(b.id)) - Number(usedCatSet.has(a.id)) || a.name.localeCompare(b.name, "ja"));

  // 状態を更新しつつ URL も同期（リロード・共有・戻る用。サーバ往復はしない）。
  const applyEx = (next: string[], nextOpen: string | null = openId) => {
    setEx(next);
    setOpenId(nextOpen);
    // 保存設定がある人は空でも "ex=" を残す（既定が再適用されないように）。
    const exStr = next.length ? next.join(",") : savedEx !== null ? "" : null;
    const href = hrefFor({ view, date: selected, ex: exStr, q, region: regionParam, open: nextOpen });
    window.history.replaceState(null, "", href);
  };
  // 現在の絞り込みを保存（ログイン中のみ）。次回以降の既定になる。
  const onSave = () => {
    startSave(async () => {
      await saveCalendarFilter(ex);
      router.refresh(); // savedEx を最新化（状態 ex は保持される）
    });
  };
  const toggleTop = (t: Top) => {
    const set = new Set(ex);
    if (topState(t) === "off") t.childIds.forEach((id) => set.delete(id));
    else t.childIds.forEach((id) => set.add(id));
    applyEx([...set]);
  };
  const toggleSub = (id: string) => {
    applyEx(ex.includes(id) ? ex.filter((x) => x !== id) : [...ex, id]);
  };
  const toggleOpen = (id: string) => applyEx(ex, openId === id ? null : id);
  const toggleAll = () => applyEx(allExcluded ? [] : allLeafIds);

  // ── 表示データ（除外を反映してクライアントで再計算）────────────
  const visible = (occ: Occ) => {
    const cats = occ.event.eventCategories;
    return cats.length === 0 || cats.some((ec) => !exSet.has(ec.categoryId));
  };
  const fOccurrences = useMemo(() => occurrences.filter(visible), [occurrences, exSet]);
  const fUpcoming = useMemo(() => upcomingRaw.filter(visible), [upcomingRaw, exSet]);
  const fSearch = useMemo(() => searchResults.filter(visible), [searchResults, exSet]);

  const { start, end, days } = buildRange(view, anchor);
  const isFiltering = (ex.length > 0 || regions.length > 0) && !q;
  const nearbyList = isFiltering ? dedupeByEvent(fUpcoming, 200) : dedupeByEvent(fUpcoming, 30);

  // 注目のイベント：今日以降のイベントを「気になる」が多い順（同数なら開催が近い順）で上位3件。
  // まだ誰も気になっていない（全部0件）うちは、いちばん近い開催が並ぶ。
  const highlights = useMemo(() => {
    const list = dedupeByEvent(fUpcoming, 200);
    return [...list]
      .sort((a, b) => b.event._count.bookmarks - a.event._count.bookmarks || a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 3);
  }, [fUpcoming]);

  const byDay = useMemo(() => {
    const m = new Map<string, Occ[]>();
    for (const occ of fOccurrences) {
      for (const key of occurrenceDayKeys(occ.startsAt, occ.endsAt, start, end)) {
        (m.get(key) ?? m.set(key, []).get(key)!).push(occ);
      }
    }
    for (const [key, list] of m) {
      list.sort((a, b) => {
        const aStarts = jstDayKey(a.startsAt) === key;
        const bStarts = jstDayKey(b.startsAt) === key;
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        if (aStarts) return a.startsAt.getTime() - b.startsAt.getTime();
        return a.event.canonicalTitle.localeCompare(b.event.canonicalTitle, "ja");
      });
    }
    return m;
  }, [fOccurrences, start, end]);

  const todayKey = ymdKey(todayJst());
  const selectedKey = paramFor(selected);
  const selectedEvents = byDay.get(selectedKey) ?? [];

  const backHref = hrefFor({ view, date: selected, ex: exParam, q, region: regionParam });
  const hasFilters = ex.length > 0 || regions.length > 0 || !!q;

  const addRegionOptions = availableRegions
    .filter((rg) => !regionSet.has(rg))
    .map((rg) => {
      const next = [...regions, rg];
      return { label: rg, value: rg, href: hrefFor({ view, date: selected, ex: exParam, q, region: next.join(","), open: openId }) };
    });

  return (
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
              href={hrefFor({ view, date: selected, ex: exParam, q, region: regions.filter((r) => r !== rg).join(",") || null, open: openId })}
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

      {/* カテゴリ絞り込み（除外方式・チェックで表示/非表示。押すと即時反映＝サーバ往復なし）*/}
      <div className="space-y-2">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* すべて表示 ⇄ すべて非表示（控えめなチップ）*/}
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-variant/40 px-2.5 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-surface-variant/70"
          >
            <Icon name={allExcluded ? "visibility" : "visibility_off"} className="text-[14px]" />
            {allExcluded ? "すべて表示" : "すべて非表示"}
          </button>
          {topCategories.map((c) => {
            const state = topState(c);
            const color = colorForKey(c.colorKey);
            const on = state !== "off";
            const isOpen = openId === c.id;
            return (
              <div
                key={c.id}
                className={`inline-flex shrink-0 items-stretch overflow-hidden rounded-full transition ${on ? "" : "bg-surface-variant/40"}`}
                style={on ? { backgroundColor: `${color}29` } : undefined}
              >
                <button
                  type="button"
                  onClick={() => toggleTop(c)}
                  className={`inline-flex items-center gap-1 whitespace-nowrap py-1 pl-3 text-xs font-medium transition hover:bg-black/[0.04] ${on ? "pr-2.5 text-on-surface" : "pr-3 text-on-surface-variant"}`}
                >
                  {c.name}
                  {state === "partial" && <span className="text-[9px] font-semibold text-on-surface-variant/70">一部</span>}
                </button>
                {on && (
                  <button
                    type="button"
                    onClick={() => toggleOpen(c.id)}
                    aria-label={`${c.name}の中分類を${isOpen ? "閉じる" : "開く"}`}
                    className={`grid w-6 place-items-center text-on-surface-variant transition ${isOpen ? "bg-black/[0.08]" : "bg-black/[0.03] hover:bg-black/[0.06]"}`}
                  >
                    <Icon name={isOpen ? "expand_less" : "expand_more"} className="text-[16px]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {openTop && (
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto rounded-2xl bg-surface-variant/30 px-4 py-2.5 lg:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-on-surface-variant">
              <Icon name="subdirectory_arrow_right" className="text-[16px]" />{openTop.name}
            </span>
            {subCatsOf(openTop).map((sc) => (
              <SubToggle key={sc.id} onClick={() => toggleSub(sc.id)} off={exSet.has(sc.id)} color={colorForKey(openTop.colorKey)}>
                {sc.name}
              </SubToggle>
            ))}
          </div>
        )}

        {/* 絞り込みの保存（ログイン中のみ）。保存すると次回開いたときの既定になる。*/}
        {canSave && (
          <div className="px-0.5">
            <button
              type="button"
              onClick={onSave}
              disabled={savePending || isSavedState}
              className="inline-flex items-center gap-1 rounded-full bg-surface-variant/40 px-3 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-surface-variant disabled:opacity-60"
            >
              <Icon name={isSavedState ? "bookmark_added" : "bookmark_add"} className="text-[15px]" />
              {savePending ? "保存中…" : isSavedState ? "保存済み" : "保存"}
            </button>
          </div>
        )}
      </div>

      {/* 絞り込み中の一括解除（除外・地域・検索をすべてリセット）*/}
      {hasFilters && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Icon name="filter_alt" className="text-[16px]" />
          <span>{ex.length > 0 ? `${ex.length}カテゴリを非表示中` : "絞り込み中"}</span>
          <Link href={hrefFor({ view, date: selected, ex: savedEx !== null ? "" : null })} className="inline-flex items-center gap-1 rounded-full bg-surface-variant/60 px-3 py-1 font-medium text-on-surface transition hover:bg-surface-variant">
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
            // カード1枚分（min-h-[200px]）＋カルーセル下余白(pb-2=8px)と高さを揃え、
            // 絞り込みで0件になってもレイアウトが詰まらない（視線が動かない）ようにする。
            <div className="flex h-[208px] items-center justify-center rounded-2xl border border-dashed border-outline-variant/40 bg-white px-3 text-center text-sm text-outline">
              {isFiltering ? "この条件で開催予定のイベントはありません。" : "予定されているイベントはまだありません。"}
            </div>
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
        <SearchResults
          q={q}
          results={fSearch}
          resolveColor={resolveColor}
          catById={catById}
          clearHref={hrefFor({ view, date: selected, ex: exParam, q: null, region: regionParam, open: openId })}
          from={backHref}
        />
      ) : view === "month" ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {/* カレンダーウィジェット */}
            <section className="rounded-2xl border border-outline-variant/40 bg-white p-3 shadow-md sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-xl font-bold text-on-surface sm:text-2xl">{anchor.y}年{anchor.m + 1}月</h2>
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
                  if (exParam != null) params.set("ex", exParam);
                  if (regionParam) params.set("region", regionParam);
                  if (openId) params.set("open", openId);
                  return (
                    <Link
                      key={key}
                      href={`/calendar?${params.toString()}`}
                      className={`relative flex h-16 flex-col gap-1 border-b border-r border-outline-variant/10 p-1.5 transition sm:h-[92px] ${
                        isSelected
                          ? "z-10 rounded-lg bg-primary-container/15 ring-2 ring-inset ring-primary"
                          : list.length > 0 && inMonth
                            ? "bg-primary/[0.035] hover:bg-primary/[0.06]"
                            : "hover:bg-surface-variant/40"
                      } ${inMonth ? "" : "opacity-30"}`}
                    >
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
                          {/* モバイル：色ドット＋「N件」 */}
                          <div className="mt-auto flex items-center gap-1 sm:hidden">
                            <div className="flex gap-0.5">
                              {list.slice(0, 3).map((occ) => (
                                <span key={occ.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: eventColor(occ) }} />
                              ))}
                            </div>
                            <span className="text-[9px] font-semibold leading-none text-on-surface-variant">{list.length}件</span>
                          </div>
                          {/* PC：イベント名＋「N件」 */}
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
                            <span className="mt-px px-1 text-[9px] font-semibold leading-none text-on-surface-variant">
                              {list.length}件
                            </span>
                          </div>
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* 選択日のイベント。PCではカレンダーと同じ高さに収め、件数が多い分は内部スクロール。*/}
            <section className="relative rounded-2xl border border-outline-variant/30 bg-white shadow-sm">
              <div className="flex max-h-[460px] flex-col p-4 lg:absolute lg:inset-0 lg:max-h-none">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">{selected.m + 1}月{selected.d}日のイベント</h3>
                  <span className="shrink-0 rounded-full bg-surface-variant/50 px-2 py-0.5 text-xs font-semibold text-on-surface-variant">{selectedEvents.length}件</span>
                </div>
                <div className="custom-scroll -mr-1.5 flex-1 space-y-3 overflow-y-auto pr-1.5">
                  {selectedEvents.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-outline-variant/40 px-3 py-10 text-center text-sm text-outline">この日のイベントはありません</p>
                  ) : (
                    selectedEvents.map((occ) => (
                      <DayPanelCard key={occ.id} occ={occ} resolveColor={resolveColor} catById={catById} from={backHref} dayKey={selectedKey} />
                    ))
                  )}
                </div>
                <Link href="/submit" className="mt-3 flex shrink-0 items-center justify-center gap-1 rounded-lg bg-primary/10 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15">
                  <Icon name="add" className="text-[18px]" /> イベントを投稿
                </Link>
              </div>
            </section>
          </div>
        </>
      ) : (
        <DayList days={days} byDay={byDay} todayKey={todayKey} resolveColor={resolveColor} catById={catById} from={backHref} />
      )}

      {/* 注目のイベント（カレンダーの下。気になる順で上位3件・横スクロール）。テキスト検索中は出さない。*/}
      {!q && highlights.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-bold text-on-surface">注目のイベント</h3>
          <Carousel>
            {highlights.map((occ) => (
              <HighlightCard key={occ.id} occ={occ} color={eventColor(occ)} catById={catById} from={backHref} />
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}

// 中分類の表示/非表示トグル。off＝グレー、on＝カテゴリ色の塗り（アイコン・枠なし）。
function SubToggle({ onClick, off, color, children }: { onClick: () => void; off: boolean; color: string; children: React.ReactNode }) {
  const base = "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-medium transition hover:brightness-[0.97]";
  if (off) {
    return (
      <button type="button" onClick={onClick} className={`${base} bg-white/60 text-on-surface-variant hover:bg-white`}>
        {children}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} text-on-surface`} style={{ backgroundColor: `${color}33` }}>
      {children}
    </button>
  );
}

// 選択日リストのカード（モックアップ調）
function DayPanelCard({ occ, resolveColor, catById, from, dayKey }: { occ: Occ; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; from: string; dayKey?: string }) {
  const cat = occ.event.eventCategories[0];
  const color = cat ? resolveColor(cat.categoryId) : colorForKey(null);
  const startKey = jstDayKey(occ.startsAt);
  const multiDay = !!occ.endsAt && jstDayKey(occ.endsAt) !== startKey;
  const ongoing = multiDay && !!dayKey && dayKey !== startKey;
  const end = occ.endsAt ? `${jstParts(occ.endsAt).m + 1}/${jstParts(occ.endsAt).d}` : "";
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
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">開催中 〜{end}</span>
          ) : (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">初日 〜{end}</span>
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

// 注目ハイライトのカード（横スクロール用・カテゴリ色のグラデーション）。
function HighlightCard({ occ, color, catById, from }: { occ: Occ; color: string; catById: Map<string, { name: string }>; from: string }) {
  const p = jstParts(occ.startsAt);
  const likes = occ.event._count.bookmarks;
  return (
    <Link
      href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`}
      className="group relative flex h-44 w-[300px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl p-5 text-white shadow-lg sm:w-[340px]"
      style={{ background: `linear-gradient(135deg, ${color}, #004ac6)` }}
    >
      <div className="absolute inset-0 bg-black/25" />
      {likes > 0 && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-primary">
          <Icon name="favorite" className="text-[13px]" />{likes}
        </span>
      )}
      <div className="relative flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          {occ.event.eventCategories.slice(0, 2).map((ec) => (
            <span key={ec.categoryId} className="rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm">{catById.get(ec.categoryId)?.name ?? ""}</span>
          ))}
        </div>
        <h2 className="line-clamp-2 text-lg font-bold leading-tight">{occ.event.canonicalTitle}</h2>
        <p className="truncate text-xs text-white/85">{p.y}年{p.m + 1}月{p.d}日{occ.event.venue ? ` ・ ${occ.event.venue.name}` : ""}</p>
      </div>
    </Link>
  );
}

// 直近イベントのカルーセル用カード（縦型・カテゴリ色のヘッダー）
function CarouselCard({ occ, resolveColor, catById, from }: { occ: Occ; resolveColor: (id: string) => string; catById: Map<string, { name: string }>; from: string }) {
  const p = jstParts(occ.startsAt);
  const cat = occ.event.eventCategories[0];
  const color = cat ? resolveColor(cat.categoryId) : colorForKey(null);
  const ongoing = isOngoing(occ);
  const catName = cat ? (catById.get(cat.categoryId)?.name ?? "") : "";
  return (
    <Link
      href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`}
      className="group flex min-h-[200px] w-60 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
