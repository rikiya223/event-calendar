import type { EventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// 遊びアイデア(Idea)を1件作成する。管理画面・CSV一括投入から使う。
export async function createIdeaFromPayload(p: {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  area?: string | null;
  region?: string | null;
  minPeople?: number | null;
  maxPeople?: number | null;
  mood?: string | null;
  weather?: string | null;
  durationMin?: number | null;
  categoryIds: string[];
  status: EventStatus;
}) {
  return prisma.idea.create({
    data: {
      title: p.title,
      description: p.description || null,
      imageUrl: p.imageUrl || null,
      area: p.area || null,
      region: p.region || null,
      minPeople: p.minPeople ?? null,
      maxPeople: p.maxPeople ?? null,
      mood: p.mood || null,
      weather: p.weather || null,
      durationMin: p.durationMin ?? null,
      status: p.status,
      ideaCategories: p.categoryIds.length
        ? { create: p.categoryIds.map((categoryId) => ({ categoryId })) }
        : undefined,
    },
  });
}
