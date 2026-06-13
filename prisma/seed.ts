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
  {
    name: "スポーツ",
    colorKey: "green",
    icon: "⚽",
    children: [
      "野球", "サッカー", "バスケ", "ラグビー", "バレー", "テニス", "バドミントン", "卓球",
      "ゴルフ", "相撲", "格闘技", "ボクシング", "競馬", "競輪", "ボートレース", "陸上・マラソン",
      "水泳", "体操", "フィギュアスケート", "スキー・スノーボード", "モータースポーツ",
      "サイクリング", "アメフト", "ハンドボール", "ホッケー", "総合競技大会", "その他スポーツ",
    ],
  },
  {
    name: "音楽・ライブ",
    colorKey: "pink",
    icon: "🎵",
    children: [
      "ライブ", "フェス", "クラシック", "オペラ", "ジャズ", "アイドル・声優", "K-POP",
      "EDM・クラブ", "バンド・ロック", "ヒップホップ", "吹奏楽・合唱", "その他音楽",
    ],
  },
  {
    name: "展覧会・美術館",
    colorKey: "amber",
    icon: "🖼️",
    children: [
      "美術展", "現代アート", "博物館", "写真展", "デザイン・工芸", "建築", "書・文学",
      "科学・自然", "ギャラリー", "その他展示",
    ],
  },
  {
    name: "映画・エンタメ",
    colorKey: "red",
    icon: "🎬",
    children: [
      "公開日", "試写会", "映画祭", "舞台・演劇", "ミュージカル", "歌舞伎・能・狂言",
      "バレエ・ダンス", "お笑い・寄席", "サーカス・大道芸", "トークショー", "その他エンタメ",
    ],
  },
  {
    name: "ゲーム・発売日",
    colorKey: "lime",
    icon: "🎮",
    children: ["発売日", "アップデート", "eスポーツ", "ゲームイベント", "ボードゲーム・TRPG", "レトロゲーム", "その他ゲーム"],
  },
  {
    name: "アニメ・サブカル",
    colorKey: "indigo",
    icon: "🎨",
    children: [
      "アニメ放送・配信", "アニメ映画", "アニメイベント", "声優イベント", "コスプレ",
      "漫画・ラノベ", "グッズ・コラボ", "Vtuber", "特撮・ヒーロー", "その他サブカル",
    ],
  },
  {
    name: "グルメ・フード",
    colorKey: "orange",
    icon: "🍴",
    children: ["フードフェス", "物産展", "グルメイベント", "ビアガーデン", "酒・ワイン", "スイーツ", "マルシェ・市", "ポップアップ", "その他グルメ"],
  },
  {
    name: "祝日・カレンダー行事",
    colorKey: "purple",
    icon: "📅",
    children: [
      "祝日", "記念日", "季節行事", "祭り", "花火", "盆踊り", "桜・花見", "紅葉",
      "イルミネーション", "クリスマスマーケット", "初詣・初日の出", "節分・節句", "表彰・賞レース", "その他行事",
    ],
  },
  {
    name: "学び・ビジネス",
    colorKey: "teal",
    icon: "💼",
    children: ["セミナー・講演", "カンファレンス", "展示会・見本市", "ワークショップ・体験", "資格試験", "就活・キャリア", "テック・IT", "起業・スタートアップ", "その他ビジネス"],
  },
  {
    name: "暮らし・地域",
    colorKey: "rose",
    icon: "🏘️",
    children: ["地域イベント", "マルシェ・フリマ", "ファミリー・子ども", "動物・ペット", "ボランティア", "健康・医療", "防災", "ガーデニング・園芸", "旅行・観光", "その他暮らし"],
  },
  { name: "その他", colorKey: "slate", icon: "✨", children: ["即売会・同人", "展示会・カルチャー", "その他"] },
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
