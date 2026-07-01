import type { NextRequest } from "next/server";
import type { Mood, Weather } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ── スマホアプリ(ANALOGS)向け 読み取りAPI ──────────────────────
// GET /api/v1/ideas?region=&weather=&mood=&people=
//
// 公開済みの遊びアイデアを一覧で返す。日付を持たないため occurrences のような
// 範囲指定はなく、単純な一覧。アイデアは件数が少ない想定なので詳細画面用の
// データもまとめて返し、一覧・詳細どちらもこの1本で賄う。
//
// フィルター無指定時は常にランダム順（一覧の基本表示がランダムのため）。
// - region: 完全一致
// - weather / mood: 列挙値（例: SUNNY, REFRESH）の完全一致
// - people: この人数を受け入れられるアイデアのみ（min/maxが未設定の側は無条件でOK）

export const dynamic = "force-dynamic";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const region = sp.get("region")?.trim() || undefined;
  const weather = (sp.get("weather")?.trim() || undefined) as Weather | undefined;
  const mood = (sp.get("mood")?.trim() || undefined) as Mood | undefined;
  const peopleRaw = sp.get("people");
  const people = peopleRaw ? Number.parseInt(peopleRaw, 10) : undefined;

  const ideas = await prisma.idea.findMany({
    where: {
      status: "PUBLISHED",
      ...(region ? { region } : {}),
      ...(weather ? { weather } : {}),
      ...(mood ? { mood } : {}),
      ...(people != null && Number.isFinite(people)
        ? {
            AND: [
              { OR: [{ minPeople: null }, { minPeople: { lte: people } }] },
              { OR: [{ maxPeople: null }, { maxPeople: { gte: people } }] },
            ],
          }
        : {}),
    },
  });

  const data = shuffle(ideas).map((i) => ({
    id: i.id,
    title: i.title,
    description: i.description,
    imageUrl: i.imageUrl,
    area: i.area,
    region: i.region,
    address: i.address,
    minPeople: i.minPeople,
    maxPeople: i.maxPeople,
    mood: i.mood,
    weather: i.weather,
    durationMin: i.durationMin,
    belongings: i.belongings,
  }));

  return Response.json({ count: data.length, ideas: data });
}
