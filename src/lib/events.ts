import { prisma } from "@/lib/prisma";
import { EventStatus, SourceType } from "@prisma/client";

// 会場は名前で名寄せ（同名があれば再利用、無ければ作成）
export async function findOrCreateVenue(
  name?: string | null,
  address?: string | null,
  region?: string | null,
) {
  const n = (name ?? "").trim();
  if (!n) return null;
  const r = (region ?? "").trim() || null;
  const existing = await prisma.venue.findFirst({ where: { name: n } });
  if (existing) {
    // 既存会場に地域が無く、今回指定があれば補完する
    if (r && !existing.region) {
      return prisma.venue.update({ where: { id: existing.id }, data: { region: r } });
    }
    return existing;
  }
  return prisma.venue.create({
    data: { name: n, address: (address ?? "").trim() || null, region: r },
  });
}

export type OccurrenceInput = { startsAt: Date; endsAt: Date | null };

// 出演者は名前で名寄せ（同名があれば再利用、無ければ作成）して id 配列を返す
export async function findOrCreatePerformers(names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const ids: string[] = [];
  for (const name of unique) {
    const existing = await prisma.performer.findFirst({ where: { name } });
    if (existing) ids.push(existing.id);
    else {
      const created = await prisma.performer.create({ data: { name, type: "other" } });
      ids.push(created.id);
    }
  }
  return ids;
}

// 1つの正規イベントを、開催回（複数可）・ソース・カテゴリ・出演者付きで作成する共通処理。
// 手動登録（admin）とユーザー投稿の承認（approve）の両方から使う。
export async function createEventFromPayload(p: {
  title: string;
  description?: string | null;
  occurrences: OccurrenceInput[];
  venueName?: string | null;
  venueAddress?: string | null;
  venueRegion?: string | null;
  categoryIds: string[];
  performerNames?: string[];
  status: EventStatus;
  sourceType: SourceType;
  sourceUrl?: string | null;
  trustWeight: number;
  confidenceScore: number;
}) {
  const venue = await findOrCreateVenue(p.venueName, p.venueAddress, p.venueRegion);
  const performerIds = await findOrCreatePerformers(p.performerNames ?? []);
  return prisma.event.create({
    data: {
      canonicalTitle: p.title,
      description: p.description || null,
      status: p.status,
      confidenceScore: p.confidenceScore,
      venueId: venue?.id ?? null,
      occurrences: { create: p.occurrences.map((o) => ({ startsAt: o.startsAt, endsAt: o.endsAt })) },
      sources: {
        create: {
          sourceType: p.sourceType,
          sourceUrl: p.sourceUrl ?? null,
          trustWeight: p.trustWeight,
        },
      },
      eventCategories: p.categoryIds.length
        ? { create: p.categoryIds.map((categoryId) => ({ categoryId })) }
        : undefined,
      eventPerformers: performerIds.length
        ? { create: performerIds.map((performerId) => ({ performerId })) }
        : undefined,
    },
  });
}
