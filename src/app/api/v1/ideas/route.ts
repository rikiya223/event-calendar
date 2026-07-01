import { prisma } from "@/lib/prisma";

// ── スマホアプリ(ANALOGS)向け 読み取りAPI ──────────────────────
// GET /api/v1/ideas
//
// 公開済みの遊びアイデアを一覧で返す。日付を持たないため occurrences のような
// 範囲指定はなく、単純な一覧。アイデアは件数が少ない想定なので詳細画面用の
// データもまとめて返し、一覧・詳細どちらもこの1本で賄う。

export const dynamic = "force-dynamic";

export async function GET() {
  const ideas = await prisma.idea.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  const data = ideas.map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    imageUrl: i.imageUrl,
    area: i.area,
    region: i.region,
    minPeople: i.minPeople,
    maxPeople: i.maxPeople,
    mood: i.mood,
    weather: i.weather,
    durationMin: i.durationMin,
    belongings: i.belongings,
  }));

  return Response.json({ count: data.length, ideas: data });
}
