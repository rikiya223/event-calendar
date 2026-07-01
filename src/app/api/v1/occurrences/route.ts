import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, jstMidnightUtc, parseDateParam } from "@/lib/calendar";

// ── スマホアプリ(ANALOGS)向け 読み取りAPI ──────────────────────
// GET /api/v1/occurrences?start=YYYY-MM-DD&end=YYYY-MM-DD&region=東京都,神奈川県
//
// カレンダーに出す「開催回」を日付範囲で返す。Web版カレンダーの loadOccurrences と
// 同じクエリ思想（範囲内に始まる回 ＋ 範囲より前に始まり範囲にかかる会期もの）を踏襲。
// start/end は JST の暦日。end は「その日を含む」= 翌0時までを範囲に含める。
//
// 認証は不要（Web版カレンダーと同じく公開データ）。DBとクエリ文字列を読むため常に動的。

export const dynamic = "force-dynamic";

const MAX_WINDOW_DAYS = 62; // 一度に引ける最大範囲（重いクエリを防ぐ）

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  // start：省略時は今日(JST)。end：省略時は start＋31日。
  const startYmd = parseDateParam(sp.get("start"));
  const start = jstMidnightUtc(startYmd.y, startYmd.m, startYmd.d);

  const endParam = sp.get("end");
  let end = endParam
    ? (() => {
        const e = parseDateParam(endParam);
        // end 当日も含めたいので +1日（排他的上限にする）
        return addDays(jstMidnightUtc(e.y, e.m, e.d), 1);
      })()
    : addDays(start, 31);

  // 範囲の健全化：end が start 以下なら1日、広すぎるなら上限でクランプ。
  if (end <= start) end = addDays(start, 1);
  const maxEnd = addDays(start, MAX_WINDOW_DAYS);
  if (end > maxEnd) end = maxEnd;

  const regions = (sp.get("region") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const occurrences = await prisma.eventOccurrence.findMany({
    where: {
      OR: [
        { startsAt: { gte: start, lt: end } },
        { startsAt: { lt: start }, endsAt: { gte: start } },
      ],
      event: {
        status: "PUBLISHED",
        ...(regions.length ? { venue: { region: { in: regions } } } : {}),
      },
    },
    orderBy: { startsAt: "asc" },
    include: {
      event: {
        include: {
          venue: true,
          eventCategories: { select: { categoryId: true } },
          _count: { select: { bookmarks: true } },
        },
      },
    },
  });

  const data = occurrences.map((o) => ({
    id: o.id,
    eventId: o.eventId,
    title: o.event.canonicalTitle,
    startsAt: o.startsAt.toISOString(),
    endsAt: o.endsAt ? o.endsAt.toISOString() : null,
    venue: o.event.venue
      ? {
          name: o.event.venue.name,
          region: o.event.venue.region,
          lat: o.event.venue.lat,
          lng: o.event.venue.lng,
        }
      : null,
    categoryIds: o.event.eventCategories.map((c) => c.categoryId),
    bookmarkCount: o.event._count.bookmarks,
  }));

  return Response.json({
    range: { start: start.toISOString(), end: end.toISOString() },
    count: data.length,
    occurrences: data,
  });
}
