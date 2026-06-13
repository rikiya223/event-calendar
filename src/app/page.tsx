import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { colorForKey } from "@/lib/categoryColors";
import { categoryIcon } from "@/lib/categoryIcons";
import { jstParts, formatJstTime } from "@/lib/calendar";
import { activeOccurrenceFilter, isOngoing, endLabel, dedupeByEvent } from "@/lib/eventStatus";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const topCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, colorKey: true, parentId: true },
  });
  const allCategories = await prisma.category.findMany({
    select: { id: true, colorKey: true, parentId: true },
  });
  const catById = new Map(allCategories.map((c) => [c.id, c]));
  function resolveColor(categoryId: string): string {
    let cur = catById.get(categoryId);
    while (cur && !cur.colorKey && cur.parentId) cur = catById.get(cur.parentId);
    return colorForKey(cur?.colorKey);
  }

  // 終了したイベントは除外し、開催中（会期中）のものは含める。
  // 多めに取得してイベント単位で重複排除（大相撲など多数の開催回を1件に）。
  const upcoming = dedupeByEvent(
    await prisma.eventOccurrence.findMany({
      where: { ...activeOccurrenceFilter(), event: { status: "PUBLISHED" } },
      orderBy: { startsAt: "asc" },
      take: 40,
      include: { event: { include: { venue: true, eventCategories: { select: { categoryId: true } } } } },
    }),
    6,
  );

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* ヒーロー */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container px-6 py-10 text-white shadow-lg shadow-primary/20 sm:px-10 sm:py-14">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              気になるイベントを、<br />カレンダーで見つけよう。
            </h1>
            <p className="mt-3 text-sm text-white/80 sm:text-base">
              スポーツ・音楽・展覧会・映画・ゲーム… 日本中のイベントを一か所で。
            </p>
            <form action="/explore" method="get" className="relative mt-6 max-w-md">
              <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                name="q"
                placeholder="イベント、キーワードで検索"
                className="h-12 w-full rounded-full border-none bg-white pl-12 pr-4 text-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/calendar" className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-on-primary-container">
                <Icon name="calendar_today" className="text-[18px]" /> カレンダーを見る
              </Link>
              <Link href="/submit" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25">
                <Icon name="add" className="text-[18px]" /> イベントを投稿
              </Link>
            </div>
          </div>
          {/* 装飾 */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/10" />
        </section>

        {/* カテゴリーから探す */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-on-surface">カテゴリーから探す</h2>
            <Link href="/explore" className="text-sm font-semibold text-primary hover:underline">すべて見る</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {topCategories.map((c) => {
              const color = colorForKey(c.colorKey);
              return (
                <Link
                  key={c.id}
                  href={`/calendar?cat=${c.id}`}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-outline-variant/30 bg-white p-4 transition hover:border-primary/40 hover:shadow-md"
                >
                  <span className="mb-2 grid h-12 w-12 place-items-center rounded-full transition group-hover:scale-110" style={{ backgroundColor: `${color}26` }}>
                    <Icon name={categoryIcon(c.name)} className="text-[24px]" />
                  </span>
                  <span className="text-center text-xs font-semibold text-on-surface">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 近日開催 */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-on-surface">近日開催のイベント</h2>
            <Link href="/calendar" className="text-sm font-semibold text-primary hover:underline">もっと見る</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-outline-variant/40 bg-white px-3 py-12 text-center text-sm text-outline">
              予定されているイベントはまだありません。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((occ) => {
                const p = jstParts(occ.startsAt);
                const cat = occ.event.eventCategories[0];
                const color = cat ? resolveColor(cat.categoryId) : colorForKey(null);
                const ongoing = isOngoing(occ);
                return (
                  <Link
                    key={occ.id}
                    href={`/events/${occ.event.id}?from=/`}
                    className="group flex gap-3 rounded-2xl border border-outline-variant/30 bg-white p-3 transition hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
                  >
                    <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border ${ongoing ? "border-amber-200 bg-amber-50" : "border-outline-variant/20 bg-surface-container-high"}`}>
                      {ongoing ? (
                        <span className="text-center text-[11px] font-bold leading-tight text-amber-600">開催<br />中</span>
                      ) : (
                        <>
                          <span className="text-xl font-bold leading-none text-primary">{p.d}</span>
                          <span className="mt-1 text-[10px] font-bold tracking-widest text-outline">{p.m + 1}月</span>
                        </>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="mb-1 inline-block h-1.5 w-8 rounded-full" style={{ backgroundColor: color }} />
                      <h3 className="truncate font-bold text-on-surface transition-colors group-hover:text-primary">{occ.event.canonicalTitle}</h3>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-on-surface-variant">
                        <Icon name="schedule" className="text-[14px]" />{ongoing ? `${endLabel(occ.endsAt)} まで` : formatJstTime(occ.startsAt)}
                        {occ.event.venue ? `　${occ.event.venue.name}` : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
