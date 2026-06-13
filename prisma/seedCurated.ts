// 手動キュレーションイベント（実在・出典付き）。
//   投入:   npm run db:seed:curated
// 冪等：各イベントの sourceUrl（出典URL＋識別子）で重複登録を防ぐ。再実行・追記OK。
// 方針：日付・会場・名称は事実情報。説明文は自前の短文（転載しない）。
import { PrismaClient, SourceType } from "@prisma/client";

const prisma = new PrismaClient();

type Curated = {
  title: string;
  occurrences: { start: string; end?: string }[]; // JST
  venue?: { name: string; address?: string; region?: string };
  categoryName: string;
  description?: string;
  sourceUrl: string; // 出典（冪等キー）
};

// 大相撲のような毎日開催は日次の開催回を生成
function daily(startDate: string, endDate: string, time: string): { start: string }[] {
  const out: { start: string }[] = [];
  const d = new Date(`${startDate}T00:00:00+09:00`);
  const end = new Date(`${endDate}T00:00:00+09:00`);
  while (d.getTime() <= end.getTime()) {
    const iso = new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    out.push({ start: `${iso}T${time}:00+09:00` });
    d.setTime(d.getTime() + 86400000);
  }
  return out;
}

const CURATED: Curated[] = [
  {
    title: "FUJI ROCK FESTIVAL '26",
    occurrences: [
      { start: "2026-07-24T11:00:00+09:00" },
      { start: "2026-07-25T11:00:00+09:00" },
      { start: "2026-07-26T11:00:00+09:00" },
    ],
    venue: { name: "苗場スキー場", region: "新潟県" },
    categoryName: "フェス",
    description: "日本最大級の野外音楽フェスティバル。3日間開催。",
    sourceUrl: "https://www.fujirockfestival.com/",
  },
  {
    title: "SUMMER SONIC 2026（東京）",
    occurrences: [
      { start: "2026-08-14T10:00:00+09:00" },
      { start: "2026-08-15T10:00:00+09:00" },
      { start: "2026-08-16T10:00:00+09:00" },
    ],
    venue: { name: "ZOZOマリンスタジアム・幕張メッセ", region: "千葉県" },
    categoryName: "フェス",
    description: "都市型音楽フェス。2026年は25周年で3日間開催（大阪会場と同時開催）。",
    sourceUrl: "https://www.summersonic.com/",
  },
  {
    title: "コミックマーケット108（C108）",
    occurrences: [
      { start: "2026-08-15T10:30:00+09:00", end: "2026-08-15T16:00:00+09:00" },
      { start: "2026-08-16T10:30:00+09:00", end: "2026-08-16T16:00:00+09:00" },
    ],
    venue: { name: "東京ビッグサイト", address: "東京都江東区有明3-11-1", region: "東京都" },
    categoryName: "その他",
    description: "世界最大級の同人誌即売会。50周年イヤーの締めくくり。",
    sourceUrl: "https://www.comiket.co.jp/",
  },
  {
    title: "東京ゲームショウ2026",
    occurrences: [
      { start: "2026-09-17T10:00:00+09:00" },
      { start: "2026-09-18T10:00:00+09:00" },
      { start: "2026-09-19T10:00:00+09:00" },
      { start: "2026-09-20T10:00:00+09:00" },
      { start: "2026-09-21T10:00:00+09:00" },
    ],
    venue: { name: "幕張メッセ", address: "千葉県千葉市美浜区中瀬2-1", region: "千葉県" },
    categoryName: "ゲーム・発売日",
    description: "30周年・史上初の5日間開催となるゲームの祭典（前半2日はビジネスデイ）。",
    sourceUrl: "https://tgs.nikkeibp.co.jp/",
  },
  {
    title: "第49回 隅田川花火大会",
    occurrences: [{ start: "2026-07-25T19:00:00+09:00", end: "2026-07-25T20:30:00+09:00" }],
    venue: { name: "隅田川（桜橋〜厩橋周辺）", region: "東京都" },
    categoryName: "季節行事",
    description: "東京の夏を代表する花火大会。約2万発を打ち上げ予定。",
    sourceUrl: "https://www.sumidagawa-hanabi.com/",
  },
  {
    title: "ピカソ meets ポール・スミス 遊び心の冒険へ（国立新美術館）",
    occurrences: [{ start: "2026-06-10T10:00:00+09:00", end: "2026-09-21T18:00:00+09:00" }],
    venue: { name: "国立新美術館", address: "東京都港区六本木7-22-2", region: "東京都" },
    categoryName: "美術展",
    description: "パリ国立ピカソ美術館の名品を、ポール・スミスの会場演出で展示する特別展。会期は9月21日まで。",
    sourceUrl: "https://www.nact.jp/exhibition_and_event/",
  },
  {
    title: "大相撲 名古屋場所（七月場所）",
    occurrences: daily("2026-07-12", "2026-07-26", "08:45"),
    venue: { name: "IGアリーナ", address: "愛知県名古屋市北区名城1-4-1", region: "愛知県" },
    categoryName: "相撲",
    description: "大相撲七月場所。7月12日初日〜7月26日千秋楽の15日間。",
    sourceUrl: "https://static.chunichi.co.jp/chunichi/pages/event/sumo/",
  },
  {
    title: "マイナビオールスターゲーム2026 第1戦",
    occurrences: [{ start: "2026-07-28T18:30:00+09:00" }],
    venue: { name: "東京ドーム", address: "東京都文京区後楽1-3-61", region: "東京都" },
    categoryName: "野球",
    description: "プロ野球オールスター第1戦。東京ドームでは7年ぶりの開催。",
    sourceUrl: "https://npb.jp/allstar/#game1",
  },
  {
    title: "マイナビオールスターゲーム2026 第2戦",
    occurrences: [{ start: "2026-07-29T18:30:00+09:00" }],
    venue: { name: "富山市民球場", region: "富山県" },
    categoryName: "野球",
    description: "プロ野球オールスター第2戦。富山では30年ぶりの開催。",
    sourceUrl: "https://npb.jp/allstar/#game2",
  },
  {
    title: "第175回 芥川賞・直木賞 選考会（受賞作発表）",
    occurrences: [{ start: "2026-07-15T17:00:00+09:00" }],
    categoryName: "表彰・賞レース",
    description: "2026年上半期の芥川龍之介賞・直木三十五賞の選考会。受賞作が発表される。",
    sourceUrl: "https://bungakushinko.or.jp/award/akutagawa/index.html",
  },
  {
    title: "第39回 東京国際映画祭",
    occurrences: [{ start: "2026-10-26T10:00:00+09:00", end: "2026-11-04T21:00:00+09:00" }],
    venue: { name: "日比谷・有楽町・丸の内・銀座エリア", region: "東京都" },
    categoryName: "映画・エンタメ",
    description: "日本最大級の国際映画祭。10日間にわたり上映・イベントを開催。",
    sourceUrl: "https://2026.tiff-jp.net/ja/",
  },

  // ── プロ野球（NPB）注目カード ──
  {
    title: "プロ野球 日本シリーズ2026",
    // 第1〜7戦の開催予定日（最大7戦・4勝先取で終了）。会場・対戦は未定。
    occurrences: [
      { start: "2026-10-24T18:30:00+09:00" },
      { start: "2026-10-25T18:30:00+09:00" },
      { start: "2026-10-27T18:30:00+09:00" },
      { start: "2026-10-28T18:30:00+09:00" },
      { start: "2026-10-29T18:30:00+09:00" },
      { start: "2026-10-31T18:30:00+09:00" },
      { start: "2026-11-01T18:30:00+09:00" },
    ],
    categoryName: "野球",
    description: "プロ野球の日本一を決めるシリーズ。第1戦は10月24日、セ・リーグ本拠地で開幕予定。最大7戦。",
    sourceUrl: "https://npb.jp/championship/2026/",
  },

  // ── 秋の美術展（2026年・会期確定） ──
  {
    title: "ルーヴル美術館展 ルネサンス（国立新美術館）",
    occurrences: [{ start: "2026-09-09T10:00:00+09:00", end: "2026-12-13T18:00:00+09:00" }],
    venue: { name: "国立新美術館", address: "東京都港区六本木7-22-2", region: "東京都" },
    categoryName: "美術展",
    description: "ルーヴル美術館の所蔵品でルネサンス美術をたどる大規模展。会期は12月13日まで。",
    sourceUrl: "https://www.nact.jp/#louvre-renaissance-2026",
  },
  {
    title: "森万里子展（森美術館）",
    occurrences: [{ start: "2026-10-31T10:00:00+09:00", end: "2027-03-28T22:00:00+09:00" }],
    venue: { name: "森美術館", address: "東京都港区六本木6-10-1 六本木ヒルズ森タワー53F", region: "東京都" },
    categoryName: "美術展",
    description: "現代美術家・森万里子の大規模個展。会期は2027年3月28日まで。",
    sourceUrl: "https://www.mori.art.museum/#mariko-mori-2026",
  },
  {
    title: "少女漫画・インフィニティ 萩尾望都×山岸凉子×大和和紀（国立新美術館）",
    occurrences: [{ start: "2026-10-28T10:00:00+09:00", end: "2027-02-08T18:00:00+09:00" }],
    venue: { name: "国立新美術館", address: "東京都港区六本木7-22-2", region: "東京都" },
    categoryName: "美術展",
    description: "少女漫画を切り拓いた3作家の原画展。会期は2027年2月8日まで。",
    sourceUrl: "https://www.nact.jp/#shojo-manga-infinity-2026",
  },
  {
    title: "竹久夢二 時代を創る表現者（東京国立近代美術館）",
    occurrences: [{ start: "2026-10-23T10:00:00+09:00", end: "2027-01-11T17:00:00+09:00" }],
    venue: { name: "東京国立近代美術館", address: "東京都千代田区北の丸公園3-1", region: "東京都" },
    categoryName: "美術展",
    description: "大正ロマンを象徴する画家・竹久夢二の回顧展。会期は2027年1月11日まで。",
    sourceUrl: "https://www.momat.go.jp/#takehisa-yumeji-2026",
  },
  {
    title: "大英博物館 日本美術コレクション 百花繚乱（東京都美術館）",
    occurrences: [{ start: "2026-07-25T09:30:00+09:00", end: "2026-10-18T17:30:00+09:00" }],
    venue: { name: "東京都美術館", address: "東京都台東区上野公園8-36", region: "東京都" },
    categoryName: "美術展",
    description: "開館100周年記念。大英博物館が所蔵する江戸絵画を里帰り展示。会期は10月18日まで。",
    sourceUrl: "https://www.tobikan.jp/#britishmuseum-2026",
  },
  {
    title: "オルセー美術館所蔵 いまを生きる歓び（東京都美術館）",
    occurrences: [{ start: "2026-11-14T09:30:00+09:00", end: "2027-03-28T17:30:00+09:00" }],
    venue: { name: "東京都美術館", address: "東京都台東区上野公園8-36", region: "東京都" },
    categoryName: "美術展",
    description: "開館100周年記念。オルセー美術館の名品で19世紀末の美術を紹介。会期は2027年3月28日まで。",
    sourceUrl: "https://www.tobikan.jp/#orsay-2026",
  },
  {
    title: "マリメッコ展（東京都庭園美術館）",
    occurrences: [{ start: "2026-10-03T10:00:00+09:00", end: "2026-12-20T18:00:00+09:00" }],
    venue: { name: "東京都庭園美術館", address: "東京都港区白金台5-21-9", region: "東京都" },
    categoryName: "美術展",
    description: "フィンランドのテキスタイルブランド「マリメッコ」の歩みを紹介する展覧会。会期は12月20日まで。",
    sourceUrl: "https://www.teien-art-museum.ne.jp/#marimekko-2026",
  },

  // ── 賞レース・年末特番 ──
  // ※レコ大・紅白・M-1の2026年の正式日程は本記録作成時点で未発表。
  //   以下は例年の開催日に基づく暫定。公式発表後に修正のこと。
  {
    title: "キングオブコント2026 準決勝",
    occurrences: [
      { start: "2026-09-03T18:00:00+09:00" },
      { start: "2026-09-04T18:00:00+09:00" },
    ],
    venue: { name: "ニッショーホール", address: "東京都港区虎ノ門1-13-1", region: "東京都" },
    categoryName: "表彰・賞レース",
    description: "コント日本一を決めるキングオブコント2026の準決勝。決勝は今秋TBS系で生放送予定（日程未定）。",
    sourceUrl: "https://king-of-conte.com/schedule/",
  },
  {
    title: "M-1グランプリ2026 決勝（暫定日程）",
    occurrences: [{ start: "2026-12-20T18:30:00+09:00" }],
    categoryName: "表彰・賞レース",
    description: "漫才日本一を決める年末恒例の決勝戦。※2026年の正式日程は未発表。例年12月の日曜に開催される想定の暫定日。",
    sourceUrl: "https://www.m-1gp.com/#final-2026",
  },
  {
    title: "第68回 日本レコード大賞（暫定日程）",
    occurrences: [{ start: "2026-12-30T17:30:00+09:00" }],
    venue: { name: "新国立劇場", address: "東京都渋谷区本町1-1-1", region: "東京都" },
    categoryName: "表彰・賞レース",
    description: "その年を代表する楽曲を表彰する音楽賞。※2026年の正式日程は未発表。例年12月30日開催に基づく暫定日。",
    sourceUrl: "https://www.tbs.co.jp/recordaward/#2026",
  },
  {
    title: "第77回 NHK紅白歌合戦（暫定日程）",
    occurrences: [{ start: "2026-12-31T19:20:00+09:00" }],
    venue: { name: "NHKホール", address: "東京都渋谷区神南2-2-1", region: "東京都" },
    categoryName: "表彰・賞レース",
    description: "大みそか恒例の音楽特番。※2026年の正式日程は未発表。例年12月31日開催に基づく暫定日。",
    sourceUrl: "https://www.nhk.jp/p/kouhaku/#2026",
  },

  // ── 賞・発表系（10〜12月） ──
  {
    title: "ノーベル賞2026 発表ウィーク（暫定日程）",
    // 各賞は発表日が異なる。生理学・医学→物理→化学→文学→平和→経済の順。
    occurrences: [
      { start: "2026-10-05T18:30:00+09:00" }, // 生理学・医学賞
      { start: "2026-10-06T18:45:00+09:00" }, // 物理学賞
      { start: "2026-10-07T18:45:00+09:00" }, // 化学賞
      { start: "2026-10-08T20:00:00+09:00" }, // 文学賞
      { start: "2026-10-09T18:00:00+09:00" }, // 平和賞
      { start: "2026-10-12T18:45:00+09:00" }, // 経済学賞
    ],
    categoryName: "表彰・賞レース",
    description: "各分野のノーベル賞受賞者が10月上旬に順次発表される。※2026年の正式日程は未発表。例年のスケジュールに基づく暫定日（時刻はJST目安）。",
    sourceUrl: "https://www.nobelprize.org/#2026",
  },
  {
    title: "T&D保険グループ 新語・流行語大賞2026（暫定日程）",
    occurrences: [{ start: "2026-12-01T17:00:00+09:00" }],
    categoryName: "表彰・賞レース",
    description: "その年の世相を反映した言葉を選ぶ年末恒例の賞（2025年に協賛社が変更）。例年12月1日発表（土日の場合は翌平日）。※2026年の正式日程は未発表。",
    sourceUrl: "https://www.jiyu.co.jp/singo/#2026",
  },

  // ── プロ野球 クライマックスシリーズ（パ・リーグ／日程確定） ──
  {
    title: "クライマックスシリーズ2026 パ・リーグ",
    // ファースト 10/10-12（2位vs3位）、ファイナル 10/14-19（1位vs勝者）。10/13は予備日。
    occurrences: [
      ...daily("2026-10-10", "2026-10-12", "18:00"),
      ...daily("2026-10-14", "2026-10-19", "18:00"),
    ],
    categoryName: "野球",
    description: "パ・リーグの日本シリーズ進出チームを決める短期決戦。ファーストS（10/10〜12）＋ファイナルS（10/14〜19）。会場は上位チーム本拠地。",
    sourceUrl: "https://npb.jp/games/2026/schedule_climax_pl.html",
  },

  // ── 全国の主要花火大会 ──
  {
    title: "長岡まつり大花火大会",
    occurrences: [
      { start: "2026-08-02T19:20:00+09:00" },
      { start: "2026-08-03T19:20:00+09:00" },
    ],
    venue: { name: "信濃川河畔（長生橋下流）", region: "新潟県" },
    categoryName: "季節行事",
    description: "日本三大花火の一つ。正三尺玉やフェニックスで知られる新潟・長岡の大花火大会。2日間開催。",
    sourceUrl: "https://nagaokamatsuri.com/#2026",
  },
  {
    title: "第98回 全国花火競技大会「大曲の花火」",
    occurrences: [{ start: "2026-08-29T17:10:00+09:00", end: "2026-08-29T21:30:00+09:00" }],
    venue: { name: "大曲の花火大会場（雄物川河川敷）", region: "秋田県" },
    categoryName: "季節行事",
    description: "全国の花火師が技を競う日本三大花火の一つ。昼花火（17:10〜）と夜花火（19:00〜）を実施。",
    sourceUrl: "https://www.oomagari-hanabi.com/#2026",
  },

  // ── 話題のゲーム発売日 ──
  {
    title: "グランド・セフト・オートVI（GTA6）発売",
    occurrences: [{ start: "2026-11-19T00:00:00+09:00" }],
    categoryName: "発売日",
    description: "Rockstar Gamesの超大作オープンワールド。PS5／Xbox Series X|S向けに発売（Take-Two決算で正式発表）。",
    sourceUrl: "https://www.rockstargames.com/VI",
  },
];

async function findOrCreateVenue(v?: Curated["venue"]) {
  if (!v) return null;
  const existing = await prisma.venue.findFirst({ where: { name: v.name } });
  if (existing) {
    if (v.region && !existing.region) {
      return prisma.venue.update({ where: { id: existing.id }, data: { region: v.region } });
    }
    return existing;
  }
  return prisma.venue.create({
    data: { name: v.name, address: v.address ?? null, region: v.region ?? null },
  });
}

async function main() {
  let created = 0;
  let skipped = 0;
  for (const ev of CURATED) {
    const dup = await prisma.eventSource.findFirst({ where: { sourceUrl: ev.sourceUrl } });
    if (dup) {
      skipped++;
      continue;
    }
    const cat = await prisma.category.findFirst({ where: { name: ev.categoryName } });
    const venue = await findOrCreateVenue(ev.venue);
    await prisma.event.create({
      data: {
        canonicalTitle: ev.title,
        description: ev.description ?? null,
        status: "PUBLISHED",
        confidenceScore: 80,
        venueId: venue?.id ?? null,
        occurrences: {
          create: ev.occurrences.map((o) => ({
            startsAt: new Date(o.start),
            endsAt: o.end ? new Date(o.end) : null,
          })),
        },
        sources: {
          create: { sourceType: SourceType.MANUAL, sourceUrl: ev.sourceUrl, trustWeight: 80 },
        },
        eventCategories: cat ? { create: [{ categoryId: cat.id }] } : undefined,
      },
    });
    created++;
  }
  console.log(`✅ キュレーションイベント: 作成 ${created} 件 / スキップ ${skipped} 件`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
