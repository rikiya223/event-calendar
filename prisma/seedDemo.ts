// デモ用イベント投入スクリプト（カレンダー表示の確認用）。
//   投入:   npm run db:seed:demo
//   削除:   npm run db:seed:demo -- --clear
// 既存のデモは毎回作り直す（タイトル一致で削除）。実データには触れない。
import { PrismaClient, SourceType } from "@prisma/client";

const prisma = new PrismaClient();

type Demo = {
  title: string;
  startsAt: string; // JST
  endsAt?: string;
  venue?: { name: string; address?: string; region?: string };
  categoryName?: string; // 中分類名
};

const DEMO: Demo[] = [
  { title: "J1リーグ FC東京 vs 横浜FM", startsAt: "2026-06-14T19:00:00+09:00", venue: { name: "味の素スタジアム", address: "東京都調布市西町376-3", region: "東京都" }, categoryName: "サッカー" },
  { title: "映画「夏の記憶」公開", startsAt: "2026-06-11T00:00:00+09:00", categoryName: "映画公開日" },
  { title: "新作ゲーム「星の探究」発売", startsAt: "2026-06-11T00:00:00+09:00", categoryName: "発売日" },
  { title: "モネ 睡蓮の世界 展", startsAt: "2026-06-20T10:00:00+09:00", endsAt: "2026-06-20T18:00:00+09:00", venue: { name: "国立新美術館", address: "東京都港区六本木7-22-2", region: "東京都" }, categoryName: "美術展" },
  { title: "クラシックの夕べ", startsAt: "2026-06-25T18:30:00+09:00", venue: { name: "サントリーホール", address: "東京都港区赤坂1-13-1", region: "東京都" }, categoryName: "クラシック" },
  { title: "大相撲 名古屋場所 初日", startsAt: "2026-07-12T09:00:00+09:00", venue: { name: "愛知県体育館", address: "愛知県名古屋市中区二の丸1-1", region: "愛知県" }, categoryName: "相撲" },
  { title: "サマーフェス 2026", startsAt: "2026-08-16T11:00:00+09:00", venue: { name: "ZOZOマリンスタジアム", address: "千葉県千葉市美浜区美浜1", region: "千葉県" }, categoryName: "フェス" },
];

const DEMO_TITLES = DEMO.map((d) => d.title);

async function clear() {
  const r = await prisma.event.deleteMany({ where: { canonicalTitle: { in: DEMO_TITLES } } });
  console.log("removed demo events:", r.count);
}

async function findOrCreateVenue(v?: { name: string; address?: string; region?: string }) {
  if (!v) return null;
  const existing = await prisma.venue.findFirst({ where: { name: v.name } });
  if (existing) {
    if (v.region && !existing.region) {
      return prisma.venue.update({ where: { id: existing.id }, data: { region: v.region } });
    }
    return existing;
  }
  return prisma.venue.create({ data: { name: v.name, address: v.address ?? null, region: v.region ?? null } });
}

async function main() {
  await clear(); // 既存デモを消してから入れ直す（冪等）
  if (process.argv.includes("--clear")) {
    await prisma.$disconnect();
    return;
  }

  for (const d of DEMO) {
    const cat = d.categoryName ? await prisma.category.findFirst({ where: { name: d.categoryName } }) : null;
    const venue = await findOrCreateVenue(d.venue);
    await prisma.event.create({
      data: {
        canonicalTitle: d.title,
        status: "PUBLISHED",
        confidenceScore: 80,
        venueId: venue?.id ?? null,
        occurrences: { create: { startsAt: new Date(d.startsAt), endsAt: d.endsAt ? new Date(d.endsAt) : null } },
        sources: { create: { sourceType: SourceType.MANUAL, trustWeight: 80 } },
        eventCategories: cat ? { create: [{ categoryId: cat.id }] } : undefined,
      },
    });
  }
  console.log(`✅ デモイベント ${DEMO.length} 件を投入しました`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
