import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { colorForKey } from "@/lib/categoryColors";
import { jstParts, formatJstTime } from "@/lib/calendar";
import { activeOccurrenceFilter, isOngoing, endLabel, dedupeByEvent } from "@/lib/eventStatus";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "さがす" };

// 大分類 → Material Symbols アイコン
const CAT_ICON: Record<string, string> = {
  スポーツ: "sports_soccer",
  "音楽・ライブ": "music_note",
  "展覧会・美術館": "palette",
  "映画・エンタメ": "movie",
  "ゲーム・発売日": "sports_esports",
  "祝日・カレンダー行事": "celebration",
  その他: "category",
};
const POPULAR_TAGS = ["ライブ", "美術展", "サッカー", "フェス", "公開日"];

type SearchParams = { q?: string; region?: string };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q: qRaw, region: regionRaw } = await searchParams;
  const q = (qRaw ?? "").trim();
  const region = regionRaw ?? null;

  function exploreHref(opts: { q?: string | null; region?: string | null }) {
    const sp = new URLSearchParams();
    if (opts.q) sp.set("q", opts.q);
    if (opts.region) sp.set("region", opts.region);
    const s = sp.toString();
    return s ? `/explore?${s}` : "/explore";
  }
  const fromHref = exploreHref({ q, region });

  const [allCategories, usedCatRows] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, colorKey: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.eventCategory.findMany({
      where: { event: { status: "PUBLISHED" } },
      select: { categoryId: true },
      distinct: ["categoryId"],
    }),
  ]);
  const catById = new Map(allCategories.map((c) => [c.id, c]));
  // 公開イベントがある大分類だけタイル表示（空カテゴリは出さない）
  const usedCatIds = new Set(usedCatRows.map((r) => r.categoryId));
  const childIdsByTop = new Map<string, string[]>();
  for (const c of allCategories) if (c.parentId) (childIdsByTop.get(c.parentId) ?? childIdsByTop.set(c.parentId, []).get(c.parentId)!).push(c.id);
  const topCategories = allCategories.filter(
    (c) => c.parentId === null && (usedCatIds.has(c.id) || (childIdsByTop.get(c.id) ?? []).some((id) => usedCatIds.has(id))),
  );
  function resolveColor(categoryId: string): string {
    let cur = catById.get(categoryId);
    while (cur && !cur.colorKey && cur.parentId) cur = catById.get(cur.parentId);
    return colorForKey(cur?.colorKey);
  }

  const regionRows = await prisma.venue.findMany({
    where: { region: { not: null }, events: { some: { status: "PUBLISHED" } } },
    distinct: ["region"],
    select: { region: true },
    orderBy: { region: "asc" },
  });
  const availableRegions = regionRows.map((r) => r.region!).filter(Boolean);

  // 終了したイベントは除外し、開催中（会期中）のものは含める。イベント単位で重複排除。
  const upcoming = dedupeByEvent(
    await prisma.eventOccurrence.findMany({
      where: {
        ...activeOccurrenceFilter(),
        event: {
          status: "PUBLISHED",
          ...(q ? { canonicalTitle: { contains: q, mode: "insensitive" } } : {}),
          ...(region ? { venue: { region } } : {}),
        },
      },
      orderBy: { startsAt: "asc" },
      take: q ? 120 : 40,
      include: {
        event: { include: { venue: true, eventCategories: { select: { categoryId: true } } } },
      },
    }),
    q ? 50 : 12,
  );

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 xl:grid-cols-[1fr_300px]">
        {/* メイン列 */}
        <div className="space-y-8">
          {/* 検索 */}
          <section className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">イベントをさがす</h1>
            <form action="/explore" method="get" className="relative">
              {region && <input type="hidden" name="region" value={region} />}
              <Icon
                name="search"
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[24px] text-outline"
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="イベント、キーワードで検索"
                className="h-14 w-full rounded-full border-none bg-surface-container-high pl-14 pr-12 text-base shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {q && (
                <Link
                  href={exploreHref({ region })}
                  aria-label="検索をクリア"
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-outline hover:bg-surface-variant/60"
                >
                  <Icon name="close" className="text-[20px]" />
                </Link>
              )}
            </form>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-on-surface-variant">人気のタグ:</span>
              {POPULAR_TAGS.map((t) => (
                <Link
                  key={t}
                  href={exploreHref({ q: t, region })}
                  className="rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface-variant transition hover:bg-secondary-container"
                >
                  #{t}
                </Link>
              ))}
            </div>
            {availableRegions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-1 text-xs font-medium text-on-surface-variant">
                  <Icon name="location_on" className="text-[16px]" />地域:
                </span>
                <Link
                  href={exploreHref({ q })}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    !region ? "border-on-surface font-medium text-on-surface" : "border-outline-variant/40 bg-white text-on-surface-variant hover:bg-surface-variant/40"
                  }`}
                >
                  全国
                </Link>
                {availableRegions.map((rg) => (
                  <Link
                    key={rg}
                    href={exploreHref({ q, region: region === rg ? null : rg })}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      region === rg ? "border-on-surface bg-surface-variant/60 font-medium text-on-surface" : "border-outline-variant/40 bg-white text-on-surface-variant hover:bg-surface-variant/40"
                    }`}
                  >
                    {rg}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {q ? (
            /* 検索結果 */
            <section className="space-y-3">
              <h2 className="text-sm text-on-surface-variant">
                「{q}」の検索結果（{upcoming.length}件）
                <Link href="/explore" className="ml-2 text-primary hover:underline">
                  クリア
                </Link>
              </h2>
              {upcoming.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-outline-variant/40 bg-white px-3 py-12 text-center text-sm text-outline">
                  該当するイベントが見つかりませんでした。
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {upcoming.map((o) => (
                    <EventRow key={o.id} occ={o} resolveColor={resolveColor} catById={catById} from={fromHref} />
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <>
              {/* カテゴリーから探す */}
              <section className="space-y-4">
                <div className="flex items-end justify-between">
                  <h2 className="text-xl font-bold text-on-surface">カテゴリーから探す</h2>
                  <Link href="/calendar" className="text-sm font-semibold text-primary hover:underline">
                    カレンダーへ
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {topCategories.map((c) => {
                    const color = colorForKey(c.colorKey);
                    return (
                      <Link
                        key={c.id}
                        href={`/calendar?cat=${c.id}`}
                        className="group flex flex-col items-center justify-center rounded-2xl border border-outline-variant/30 bg-white p-5 transition hover:border-primary/40 hover:shadow-md"
                      >
                        <span
                          className="mb-3 grid h-14 w-14 place-items-center rounded-full transition group-hover:scale-110"
                          style={{ backgroundColor: `${color}26` }}
                        >
                          <Icon name={CAT_ICON[c.name] ?? "category"} className="text-[26px]" />
                        </span>
                        <span className="text-sm font-semibold text-on-surface">{c.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* 近日開催 */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-on-surface">近日開催のイベント</h2>
                {upcoming.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-outline-variant/40 bg-white px-3 py-12 text-center text-sm text-outline">
                    予定されているイベントはまだありません。
                  </p>
                ) : (
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {upcoming.map((o) => (
                      <EventRow key={o.id} occ={o} resolveColor={resolveColor} catById={catById} from={fromHref} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        {/* 右レール（xl以上） */}
        <aside className="hidden space-y-6 xl:block">
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-on-surface">おすすめのイベント</h3>
            <div className="space-y-3">
              {upcoming.slice(0, 4).map((o) => {
                const p = jstParts(o.startsAt);
                const color = o.event.eventCategories[0]
                  ? resolveColor(o.event.eventCategories[0].categoryId)
                  : colorForKey(null);
                const ongoing = isOngoing(o);
                return (
                  <Link key={o.id} href={`/events/${o.event.id}?from=${encodeURIComponent(fromHref)}`} className="group flex gap-3">
                    <span
                      className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: ongoing ? "#f59e0b" : color }}
                    >
                      <Icon name={ongoing ? "bolt" : "event"} className="text-[22px]" />
                    </span>
                    <div className="flex flex-col justify-center">
                      <p className={`text-[11px] font-bold uppercase ${ongoing ? "text-amber-600" : "text-primary"}`}>
                        {ongoing ? `開催中 〜${endLabel(o.endsAt)}` : `${p.m + 1}月${p.d}日`}
                      </p>
                      <h4 className="line-clamp-1 text-sm font-semibold text-on-surface group-hover:text-primary">
                        {o.event.canonicalTitle}
                      </h4>
                      {o.event.venue && <p className="text-xs text-outline">{o.event.venue.name}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="rounded-2xl bg-primary p-5 text-white shadow-lg shadow-primary/20">
            <h4 className="text-lg font-bold">イベントを投稿しよう</h4>
            <p className="mt-1 text-sm text-white/80">
              あなたが見つけたイベントを共有して、みんなのカレンダーに載せましょう。
            </p>
            <Link
              href="/submit"
              className="mt-3 block rounded-full bg-white py-2 text-center text-sm font-semibold text-primary transition hover:bg-on-primary-container"
            >
              投稿する
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

type Occ = {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  event: {
    id: string;
    canonicalTitle: string;
    venue: { name: string } | null;
    eventCategories: { categoryId: string }[];
  };
};

function EventRow({
  occ,
  resolveColor,
  catById,
  from,
}: {
  occ: Occ;
  resolveColor: (id: string) => string;
  catById: Map<string, { name: string }>;
  from: string;
}) {
  const p = jstParts(occ.startsAt);
  const color = occ.event.eventCategories[0]
    ? resolveColor(occ.event.eventCategories[0].categoryId)
    : colorForKey(null);
  const ongoing = isOngoing(occ);
  return (
    <li>
      <Link
        href={`/events/${occ.event.id}?from=${encodeURIComponent(from)}`}
        className="flex gap-3 rounded-2xl border border-outline-variant/30 bg-white p-3 transition hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
      >
        {ongoing ? (
          <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-50 py-1">
            <span className="text-center text-[10px] font-bold leading-tight text-amber-600">開催<br />中</span>
          </div>
        ) : (
          <div
            className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl py-1"
            style={{ backgroundColor: `${color}24` }}
          >
            <span className="text-[10px] font-semibold text-on-surface-variant">{p.m + 1}月</span>
            <span className="text-lg font-bold leading-none text-on-surface">{p.d}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          {occ.event.eventCategories.length > 0 && (
            <div className="mb-0.5 flex flex-wrap gap-1">
              {occ.event.eventCategories.slice(0, 2).map((ec) => (
                <span
                  key={ec.categoryId}
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant"
                  style={{ backgroundColor: `${resolveColor(ec.categoryId)}26` }}
                >
                  {catById.get(ec.categoryId)?.name ?? ""}
                </span>
              ))}
            </div>
          )}
          <p className="truncate font-semibold leading-snug text-on-surface">{occ.event.canonicalTitle}</p>
          <p className="mt-0.5 truncate text-xs text-outline">
            🕘 {ongoing ? `${endLabel(occ.endsAt)} まで` : formatJstTime(occ.startsAt)}
            {occ.event.venue ? `　${occ.event.venue.name}` : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}
