import { prisma } from "@/lib/prisma";
import { type CalView, type Ymd, buildRange, parseDateParam, todayJst, ymdKey, jstParts, jstMidnightUtc } from "@/lib/calendar";
import { activeOccurrenceFilter } from "@/lib/eventStatus";
import { getCurrentUser } from "@/lib/supabase/server";
import { CalendarBoard } from "./CalendarBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "カレンダー" };

type SearchParams = { view?: string; date?: string; ex?: string; q?: string; region?: string; open?: string };

function normView(_v?: string): CalView {
  // 週・日ビューは廃止。常に月ビューで表示する。
  return "month";
}
function normalizeYmd(ymd: Ymd): Ymd {
  const p = jstParts(jstMidnightUtc(ymd.y, ymd.m, ymd.d));
  return { y: p.y, m: p.m, d: p.d };
}
function paramFor(ymd: Ymd): string {
  return ymdKey(normalizeYmd(ymd));
}

const occInclude = {
  event: {
    include: {
      venue: true,
      eventCategories: { select: { categoryId: true } },
      _count: { select: { bookmarks: true } }, // 「気になる」数（注目イベントの選定に使う）
    },
  },
} as const;

// イベント側の where。地域と検索を組み立てる（カテゴリ除外はクライアント側で行うのでここでは扱わない）。
// 検索はタイトルだけでなく「カテゴリ名」も対象にする（例：「競馬」で競馬カテゴリのイベントが出る）。
function eventWhere(args: { q: string; regions: string[] }) {
  return {
    status: "PUBLISHED" as const,
    ...(args.regions.length ? { venue: { region: { in: args.regions } } } : {}),
    ...(args.q
      ? {
          OR: [
            { canonicalTitle: { contains: args.q, mode: "insensitive" as const } },
            { eventCategories: { some: { category: { name: { contains: args.q, mode: "insensitive" as const } } } } },
          ],
        }
      : {}),
  };
}

async function loadOccurrences(args: { start: Date; end: Date; q: string; regions: string[] }) {
  return prisma.eventOccurrence.findMany({
    where: {
      // 範囲内に開始する回 ＋ 範囲より前に始まり範囲にかかる会期もの（展覧会など）の両方を拾う
      OR: [
        { startsAt: { gte: args.start, lt: args.end } },
        { startsAt: { lt: args.start }, endsAt: { gte: args.start } },
      ],
      event: eventWhere({ q: args.q, regions: args.regions }),
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
  const regions = (sp.region ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const openId = (sp.open ?? "").trim() || null;
  // URL に ex があれば明示指定（空 "ex=" は「全表示」の意思表示）。無ければ保存設定を既定に使う。
  const exParamPresent = sp.ex !== undefined;
  const exFromUrl = (sp.ex ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // ログインユーザーと、カテゴリ候補などを並列取得
  const [user, [regionRows, allCategories, usedCatRows]] = await Promise.all([
    getCurrentUser(),
    Promise.all([
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
    ]),
  ]);
  const availableRegions = regionRows.map((r) => r.region!).filter(Boolean);
  const usedCatIds = usedCatRows.map((r) => r.categoryId);

  // ログイン中なら保存済みの絞り込みを取得。URL未指定のときの既定に使う。
  const savedPref = user
    ? await prisma.userCalendarPref.findUnique({ where: { userId: user.id }, select: { excludedCategoryIds: true } })
    : null;
  const savedEx = savedPref?.excludedCategoryIds ?? null;
  const initialEx = exParamPresent ? exFromUrl : savedEx ?? [];

  const today = todayJst();
  const fromToday = jstMidnightUtc(today.y, today.m, today.d);
  const farFuture = new Date("2100-01-01T00:00:00Z");
  const { start, end } = buildRange(view, anchor);

  // カテゴリ除外を反映する前のデータを取得（除外はクライアントで即時適用）。
  const [searchResults, upcomingRaw, occurrences] = await Promise.all([
    q ? loadOccurrences({ start: fromToday, end: farFuture, q, regions }) : Promise.resolve([] as Occ[]),
    prisma.eventOccurrence.findMany({
      where: { ...activeOccurrenceFilter(), event: eventWhere({ q: "", regions }) },
      orderBy: { startsAt: "asc" },
      take: 150, // クライアントに送る近日開催の上限（payload削減）
      include: occInclude,
    }),
    q ? Promise.resolve([] as Occ[]) : loadOccurrences({ start, end, q: "", regions }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <CalendarBoard
        // view / date / q / region が変わったとき（＝サーバ再取得が必要なとき）だけ作り直す。
        // カテゴリ除外(ex)・中分類開閉(open)はキーに含めない＝再マウントせず即時反映。
        key={`${view}|${paramFor(selected)}|${q}|${regions.join(",")}`}
        view={view}
        selected={selected}
        q={q}
        selectedRegions={regions}
        availableRegions={availableRegions}
        categories={allCategories}
        usedCatIds={usedCatIds}
        occurrences={occurrences}
        upcomingRaw={upcomingRaw}
        searchResults={searchResults}
        initialEx={initialEx}
        initialOpen={openId}
        canSave={!!user}
        savedEx={savedEx}
      />
    </main>
  );
}
