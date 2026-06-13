import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 大分類（colorKey を持つ）。colorKey は意味的なキー名で保持し、
// 実際のパステル色は将来フロント側でマッピングする（仕様 2.1 / 4.3）。
// 子カテゴリ（中分類）は colorKey = null。表示時に親をたどって色を継承する。
const CATEGORY_TREE: {
  name: string;
  colorKey: string;
  icon: string;
  children?: string[];
}[] = [
  { name: "スポーツ", colorKey: "green", icon: "⚽", children: ["野球", "サッカー", "相撲", "競馬", "バスケ", "ラグビー", "テニス", "ゴルフ", "バレー", "卓球", "陸上・マラソン", "総合競技大会"] },
  { name: "音楽・ライブ", colorKey: "pink", icon: "🎵", children: ["ライブ", "フェス", "クラシック", "アイドル・声優"] },
  { name: "展覧会・美術館", colorKey: "amber", icon: "🖼️", children: ["美術展", "博物館", "写真展"] },
  { name: "映画・エンタメ", colorKey: "red", icon: "🎬", children: ["公開日", "試写会", "舞台・演劇", "映画祭"] },
  { name: "ゲーム・発売日", colorKey: "lime", icon: "🎮", children: ["発売日", "アップデート", "eスポーツ", "ゲームイベント"] },
  { name: "祝日・カレンダー行事", colorKey: "purple", icon: "📅", children: ["祝日", "季節行事", "祭り", "花火", "表彰・賞レース"] },
  { name: "その他", colorKey: "slate", icon: "✨", children: ["即売会・同人", "展示会・カルチャー"] },
];

async function findOrCreateCategory(
  name: string,
  parentId: string | null,
  colorKey: string | null,
  icon: string | null,
) {
  const existing = await prisma.category.findFirst({ where: { name, parentId } });
  if (existing) return existing;
  return prisma.category.create({ data: { name, parentId, colorKey, icon } });
}

async function main() {
  for (const top of CATEGORY_TREE) {
    const parent = await findOrCreateCategory(top.name, null, top.colorKey, top.icon);
    for (const childName of top.children ?? []) {
      // 中分類は colorKey null（親の色を継承）。アイコンも親を継承する想定で null。
      await findOrCreateCategory(childName, parent.id, null, null);
    }
  }

  const count = await prisma.category.count();
  console.log(`✅ Seed 完了：カテゴリ ${count} 件`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
