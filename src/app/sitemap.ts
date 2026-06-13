import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

// 静的ページ＋公開中イベントの詳細ページを列挙する。
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/calendar`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/submit`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    eventRoutes = events.map((e) => ({
      url: `${base}/events/${e.id}`,
      lastModified: e.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch {
    // DB 未接続でも sitemap 自体は返す（静的ページのみ）
  }

  return [...staticRoutes, ...eventRoutes];
}
