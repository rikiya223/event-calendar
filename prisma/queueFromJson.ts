// 抽出したイベント候補を「審査キュー」(event_submissions, PENDING) に投入するスクリプト。
//   実行: tsx prisma/queueFromJson.ts <path-to-json>
// JSON は次の形の配列:
//   { title, startsAt, endsAt?, venueName?, venueAddress?, venueRegion?,
//     description?, categoryName?, sourceName?, sourceUrl }
// sourceUrl で冪等（既存の審査キュー / 公開済み EventSource と重複したらスキップ）。
// 自動公開はしない。/admin で承認すると公開される。
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Input = {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  venueRegion?: string | null;
  description?: string | null;
  categoryName?: string | null;
  sourceName?: string | null;
  sourceUrl: string;
};

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("JSONファイルのパスを指定してください");
  const items: Input[] = JSON.parse(readFileSync(path, "utf8"));

  // categoryName → id を一括解決
  const cats = await prisma.category.findMany({ select: { id: true, name: true } });
  const catId = new Map(cats.map((c) => [c.name, c.id]));

  let created = 0;
  let skipped = 0;
  const unknownCats = new Set<string>();

  for (const it of items) {
    if (!it.sourceUrl || !it.title || !it.startsAt) {
      skipped++;
      continue;
    }
    const start = new Date(it.startsAt);
    if (Number.isNaN(start.getTime())) {
      skipped++;
      continue;
    }
    // 重複チェック（審査キュー / 公開済み）
    const dupSub = await prisma.eventSubmission.findFirst({
      where: { payload: { path: ["sourceUrl"], equals: it.sourceUrl } },
      select: { id: true },
    });
    const dupEvt = dupSub
      ? null
      : await prisma.eventSource.findFirst({ where: { sourceUrl: it.sourceUrl }, select: { id: true } });
    if (dupSub || dupEvt) {
      skipped++;
      continue;
    }

    const categoryIds: string[] = [];
    if (it.categoryName) {
      const id = catId.get(it.categoryName);
      if (id) categoryIds.push(id);
      else unknownCats.add(it.categoryName);
    }

    const payload = {
      title: it.title,
      startsAt: start.toISOString(),
      endsAt: it.endsAt ? new Date(it.endsAt).toISOString() : null,
      venueName: it.venueName ?? null,
      venueAddress: it.venueAddress ?? null,
      venueRegion: it.venueRegion ?? null,
      description: it.description ?? null,
      categoryIds,
      origin: "ai" as const,
      sourceName: it.sourceName ?? "AI抽出",
      sourceUrl: it.sourceUrl,
    };
    await prisma.eventSubmission.create({ data: { userId: null, status: "PENDING", payload } });
    created++;
  }

  console.log(`✅ 審査キュー投入: 作成 ${created} 件 / スキップ ${skipped} 件`);
  if (unknownCats.size) console.log(`⚠️ 未知のカテゴリ名（無視）: ${[...unknownCats].join(", ")}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
