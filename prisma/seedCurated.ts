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

  // ── サッカー日本代表（FIFAワールドカップ2026・グループF）──
  {
    title: "W杯2026 日本代表 vs オランダ（グループF 第1戦）",
    occurrences: [{ start: "2026-06-15T05:00:00+09:00" }], // 日本時間
    venue: { name: "AT&Tスタジアム（米国・アーリントン）" },
    categoryName: "サッカー",
    description: "北中米ワールドカップ、日本のグループステージ初戦。日本時間6月15日早朝キックオフ。",
    sourceUrl: "https://www.jfa.jp/samuraiblue/worldcup_2026/#ned",
  },
  {
    title: "W杯2026 日本代表 vs チュニジア（グループF 第2戦）",
    occurrences: [{ start: "2026-06-21T13:00:00+09:00" }],
    venue: { name: "エスタディオBBVA（メキシコ・モンテレイ）" },
    categoryName: "サッカー",
    description: "北中米ワールドカップ、日本のグループステージ第2戦。",
    sourceUrl: "https://www.jfa.jp/samuraiblue/worldcup_2026/#tun",
  },
  {
    title: "FIFAワールドカップ2026 決勝",
    occurrences: [{ start: "2026-07-20T04:00:00+09:00" }], // 現地7/19、日本時間7/20早朝
    venue: { name: "ニューヨーク・ニュージャージー・スタジアム（米国）" },
    categoryName: "サッカー",
    description: "史上最多48か国の北中米ワールドカップ決勝。現地7月19日（日本時間7月20日早朝）。",
    sourceUrl: "https://www.fifa.com/#wc2026-final",
  },

  // ── 高校野球・大相撲（夏〜秋〜冬）──
  {
    title: "第108回 全国高校野球選手権大会（夏の甲子園）",
    occurrences: [{ start: "2026-08-05T08:00:00+09:00", end: "2026-08-22T17:00:00+09:00" }],
    venue: { name: "阪神甲子園球場", address: "兵庫県西宮市甲子園町1-82", region: "兵庫県" },
    categoryName: "野球",
    description: "全国49代表が出場する夏の甲子園。8月5日開幕〜22日決勝。今大会からDH制を導入。",
    sourceUrl: "https://www.asahi.com/koshien/#2026summer",
  },
  {
    title: "大相撲 秋場所（九月場所）",
    occurrences: [{ start: "2026-09-13T08:00:00+09:00", end: "2026-09-27T18:00:00+09:00" }],
    venue: { name: "両国国技館", address: "東京都墨田区横網1-3-28", region: "東京都" },
    categoryName: "相撲",
    description: "大相撲九月場所。9月13日初日〜27日千秋楽の15日間。",
    sourceUrl: "https://www.sumo.or.jp/#aki-2026",
  },
  {
    title: "大相撲 九州場所（十一月場所）",
    occurrences: [{ start: "2026-11-08T08:00:00+09:00", end: "2026-11-22T18:00:00+09:00" }],
    venue: { name: "福岡国際センター", address: "福岡県福岡市博多区築港本町2-2", region: "福岡県" },
    categoryName: "相撲",
    description: "大相撲の年内最後の本場所。11月8日初日〜22日千秋楽の15日間。",
    sourceUrl: "https://www.sumo.or.jp/#kyushu-2026",
  },

  // ── 全国の特別展（美術・自然史博物館）──
  {
    title: "マリー・アントワネット・スタイル（横浜美術館）",
    occurrences: [{ start: "2026-08-01T10:00:00+09:00", end: "2026-11-23T18:00:00+09:00" }],
    venue: { name: "横浜美術館", address: "神奈川県横浜市西区みなとみらい3-4-1", region: "神奈川県" },
    categoryName: "美術展",
    description: "悲劇の王妃マリー・アントワネットの美意識を多彩な品々でたどる展覧会。会期は11月23日まで。",
    sourceUrl: "https://yokohama.art.museum/#marie-antoinette-2026",
  },
  {
    title: "フェルメール「真珠の耳飾りの少女」（大阪中之島美術館）",
    occurrences: [{ start: "2026-08-21T10:00:00+09:00", end: "2026-09-27T18:00:00+09:00" }],
    venue: { name: "大阪中之島美術館", address: "大阪府大阪市北区中之島4-3-1", region: "大阪府" },
    categoryName: "美術展",
    description: "フェルメールの代表作「真珠の耳飾りの少女」が来日。会期は8月21日〜9月27日。",
    sourceUrl: "https://nakka-art.jp/#vermeer-2026",
  },
  {
    title: "大絶滅展ー生命史のビッグファイブ（大阪市立自然史博物館）",
    occurrences: [{ start: "2026-07-17T09:30:00+09:00", end: "2026-10-12T17:00:00+09:00" }],
    venue: { name: "大阪市立自然史博物館", address: "大阪府大阪市東住吉区長居公園1-23", region: "大阪府" },
    categoryName: "博物館",
    description: "生命史における5度の大量絶滅をたどる特別展。会期は7月17日〜10月12日。",
    sourceUrl: "https://www.mus-nh.city.osaka.jp/#daizetsumetsu-2026",
  },

  // ── 全国の伝統祭り（夏） ──
  {
    title: "祇園祭 山鉾巡行（京都）",
    occurrences: [
      { start: "2026-07-17T09:00:00+09:00" }, // 前祭
      { start: "2026-07-24T09:30:00+09:00" }, // 後祭
    ],
    venue: { name: "京都市中心部（四条・河原町ほか）", region: "京都府" },
    categoryName: "祭り",
    description: "日本三大祭の一つ。7月の山鉾巡行（前祭17日・後祭24日）が見どころ。",
    sourceUrl: "https://ja.kyoto.travel/#gion-2026",
  },
  {
    title: "天神祭（大阪）",
    occurrences: [
      { start: "2026-07-24T16:00:00+09:00" }, // 宵宮
      { start: "2026-07-25T18:00:00+09:00" }, // 本宮（船渡御・奉納花火）
    ],
    venue: { name: "大阪天満宮・大川周辺", address: "大阪府大阪市北区天神橋2-1-8", region: "大阪府" },
    categoryName: "祭り",
    description: "日本三大祭の一つ。7月25日本宮の船渡御と奉納花火が圧巻。",
    sourceUrl: "https://osakatemmangu.or.jp/#tenjin-2026",
  },
  {
    title: "博多祇園山笠（福岡）",
    occurrences: [{ start: "2026-07-01T10:00:00+09:00", end: "2026-07-15T06:00:00+09:00" }],
    venue: { name: "櫛田神社・博多周辺", address: "福岡県福岡市博多区上川端町1-41", region: "福岡県" },
    categoryName: "祭り",
    description: "7月1日〜15日に行われる博多の夏祭り。クライマックスは15日早朝の「追い山」。",
    sourceUrl: "https://www.hakatayamakasa.com/#2026",
  },
  {
    title: "青森ねぶた祭",
    occurrences: [{ start: "2026-08-02T18:45:00+09:00", end: "2026-08-07T21:00:00+09:00" }],
    venue: { name: "青森市中心部", region: "青森県" },
    categoryName: "祭り",
    description: "巨大な人形灯籠「ねぶた」が練り歩く東北を代表する夏祭り。8月2日〜7日。",
    sourceUrl: "https://www.nebuta.jp/#2026",
  },
  {
    title: "秋田竿燈まつり",
    occurrences: [{ start: "2026-08-03T18:30:00+09:00", end: "2026-08-06T21:00:00+09:00" }],
    venue: { name: "竿燈大通り（秋田市）", region: "秋田県" },
    categoryName: "祭り",
    description: "稲穂に見立てた竿燈を操る妙技が見もの。8月3日〜6日。",
    sourceUrl: "https://www.kantou.gr.jp/#2026",
  },
  {
    title: "仙台七夕まつり",
    occurrences: [{ start: "2026-08-06T10:00:00+09:00", end: "2026-08-08T21:00:00+09:00" }],
    venue: { name: "仙台市中心部（一番町ほか）", region: "宮城県" },
    categoryName: "祭り",
    description: "豪華絢爛な七夕飾りが街を彩る。8月6日〜8日。",
    sourceUrl: "https://www.sendaitanabata.com/#2026",
  },
  {
    title: "山形花笠まつり",
    occurrences: [{ start: "2026-08-05T18:00:00+09:00", end: "2026-08-07T21:30:00+09:00" }],
    venue: { name: "十日町〜文翔館（山形市）", region: "山形県" },
    categoryName: "祭り",
    description: "花笠を手に「ヤッショ、マカショ」の掛け声で踊り練り歩く。8月5日〜7日。",
    sourceUrl: "https://www.mountain-j.com/hanagasa/#2026",
  },
  {
    title: "よさこい祭り（高知）",
    occurrences: [{ start: "2026-08-09T17:00:00+09:00", end: "2026-08-12T21:00:00+09:00" }],
    venue: { name: "高知市内（追手筋ほか）", region: "高知県" },
    categoryName: "祭り",
    description: "鳴子を鳴らして踊る高知の夏の風物詩。第73回。前夜祭9日〜後夜祭12日。",
    sourceUrl: "https://www.welcome-kochi.jp/yosakoi/#2026",
  },
  {
    title: "阿波踊り（徳島）",
    occurrences: [{ start: "2026-08-11T18:00:00+09:00", end: "2026-08-15T22:30:00+09:00" }],
    venue: { name: "徳島市内 各演舞場", region: "徳島県" },
    categoryName: "祭り",
    description: "「踊る阿呆に見る阿呆」で知られる日本最大級の盆踊り。8月11日〜15日。",
    sourceUrl: "https://www.awaodori-kaikan.jp/#2026",
  },

  // ── 総合スポーツ大会 ──
  {
    title: "第20回 アジア競技大会（愛知・名古屋2026）",
    occurrences: [{ start: "2026-09-19T19:00:00+09:00", end: "2026-10-04T22:00:00+09:00" }],
    venue: { name: "パロマ瑞穂スタジアムほか（愛知県）", region: "愛知県" },
    categoryName: "スポーツ",
    description: "アジア最大の総合競技大会が日本で開催。9月19日開会式〜10月4日閉会式、43競技。",
    sourceUrl: "https://www.aichi-nagoya2026.org/#2026",
  },

  // ── 競馬（JRA 秋のG1。日程はJRA公式の2026年G1一覧に準拠）──
  {
    title: "秋華賞",
    occurrences: [{ start: "2026-10-18T15:40:00+09:00" }],
    venue: { name: "京都競馬場", address: "京都府京都市伏見区葭島渡場島町32", region: "京都府" },
    categoryName: "競馬",
    description: "3歳牝馬三冠の最終戦GⅠ（芝2000m）。",
    sourceUrl: "https://www.jra.go.jp/keiba/g1/#shuka-2026",
  },
  {
    title: "菊花賞",
    occurrences: [{ start: "2026-10-25T15:40:00+09:00" }],
    venue: { name: "京都競馬場", address: "京都府京都市伏見区葭島渡場島町32", region: "京都府" },
    categoryName: "競馬",
    description: "3歳牡馬クラシック最後の一冠、最長距離のGⅠ（芝3000m）。",
    sourceUrl: "https://www.jra.go.jp/keiba/g1/#kikka-2026",
  },
  {
    title: "天皇賞（秋）",
    occurrences: [{ start: "2026-11-01T15:40:00+09:00" }],
    venue: { name: "東京競馬場", address: "東京都府中市日吉町1-1", region: "東京都" },
    categoryName: "競馬",
    description: "秋古馬中距離の頂点を決めるGⅠ（芝2000m）。",
    sourceUrl: "https://www.jra.go.jp/keiba/g1/akiten.html#2026",
  },
  {
    title: "エリザベス女王杯",
    occurrences: [{ start: "2026-11-15T15:40:00+09:00" }],
    venue: { name: "京都競馬場", address: "京都府京都市伏見区葭島渡場島町32", region: "京都府" },
    categoryName: "競馬",
    description: "牝馬の頂点を争う秋のGⅠ（芝2200m）。",
    sourceUrl: "https://www.jra.go.jp/keiba/g1/#elizabeth-2026",
  },
  {
    title: "マイルチャンピオンシップ",
    occurrences: [{ start: "2026-11-22T15:40:00+09:00" }],
    venue: { name: "京都競馬場", address: "京都府京都市伏見区葭島渡場島町32", region: "京都府" },
    categoryName: "競馬",
    description: "秋のマイル王決定戦GⅠ（芝1600m）。",
    sourceUrl: "https://www.jra.go.jp/datafile/seiseki/replay/2026/g1.html#mile-cs",
  },
  {
    title: "ジャパンカップ",
    occurrences: [{ start: "2026-11-29T15:40:00+09:00" }],
    venue: { name: "東京競馬場", address: "東京都府中市日吉町1-1", region: "東京都" },
    categoryName: "競馬",
    description: "世界の強豪が集う国際GⅠ（芝2400m）。",
    sourceUrl: "https://www.jra.go.jp/datafile/seiseki/replay/2026/g1.html#japan-cup",
  },
  {
    title: "チャンピオンズカップ",
    occurrences: [{ start: "2026-12-06T15:40:00+09:00" }],
    venue: { name: "中京競馬場", address: "愛知県豊明市間米町敷田1225", region: "愛知県" },
    categoryName: "競馬",
    description: "ダート日本一を決める師走のGⅠ（ダート1800m）。",
    sourceUrl: "https://www.jra.go.jp/keiba/g1/#champions-2026",
  },
  {
    title: "ホープフルステークス",
    occurrences: [{ start: "2026-12-26T15:30:00+09:00" }],
    venue: { name: "中山競馬場", address: "千葉県船橋市古作1-1-1", region: "千葉県" },
    categoryName: "競馬",
    description: "2歳GⅠ。翌年クラシックを占う一戦。",
    sourceUrl: "https://www.jra.go.jp/datafile/seiseki/replay/2026/g1.html#hopeful",
  },
  {
    title: "有馬記念",
    occurrences: [{ start: "2026-12-27T15:25:00+09:00" }],
    venue: { name: "中山競馬場", address: "千葉県船橋市古作1-1-1", region: "千葉県" },
    categoryName: "競馬",
    description: "ファン投票で出走馬が決まる年末のグランプリGⅠ（芝2500m）。1年の総決算。",
    sourceUrl: "https://www.jra.go.jp/datafile/seiseki/replay/2026/g1.html#arima",
  },

  // ── 音楽フェス（追加）──
  {
    title: "RISING SUN ROCK FESTIVAL 2026 in EZO",
    occurrences: [{ start: "2026-08-14T13:00:00+09:00", end: "2026-08-15T23:59:00+09:00" }],
    venue: { name: "石狩湾新港樽川ふ頭横 特設ステージ", region: "北海道" },
    categoryName: "フェス",
    description: "朝日を浴びてフィナーレを迎えるオールナイト野外フェス。8月14・15日。",
    sourceUrl: "https://rsr.wess.co.jp/2026/",
  },
  {
    title: "MONSTER baSH 2026",
    occurrences: [
      { start: "2026-08-22T10:00:00+09:00" },
      { start: "2026-08-23T10:00:00+09:00" },
    ],
    venue: { name: "国営讃岐まんのう公園", region: "香川県" },
    categoryName: "フェス",
    description: "中四国最大級の野外ロックフェス。8月22・23日。",
    sourceUrl: "https://www.monster-bash.com/#2026",
  },

  // ── ラグビー日本代表（秋の欧州遠征／ネーションズチャンピオンシップ）──
  // ※すべて欧州アウェイ。日本時間は深夜〜翌朝。日付は現地基準で掲載。
  {
    title: "ラグビー日本代表 vs ウェールズ",
    occurrences: [{ start: "2026-11-07T23:00:00+09:00" }],
    venue: { name: "プリンシパリティ・スタジアム（英・カーディフ）" },
    categoryName: "ラグビー",
    description: "秋の欧州遠征（ネーションズチャンピオンシップ）。現地11月7日。",
    sourceUrl: "https://www.rugby-japan.jp/#wal-2026",
  },
  {
    title: "ラグビー日本代表 vs イングランド",
    occurrences: [{ start: "2026-11-14T23:00:00+09:00" }],
    venue: { name: "アリアンツ・スタジアム（英・ロンドン／トゥイッケナム）" },
    categoryName: "ラグビー",
    description: "秋の欧州遠征。聖地トゥイッケナムでイングランドと対戦。現地11月14日。",
    sourceUrl: "https://www.rugby-japan.jp/#eng-2026",
  },
  {
    title: "ラグビー日本代表 vs スコットランド",
    occurrences: [{ start: "2026-11-21T23:00:00+09:00" }],
    venue: { name: "マレーフィールド（英・エディンバラ）" },
    categoryName: "ラグビー",
    description: "秋の欧州遠征の最終戦。スコットランドと対戦。現地11月21日。",
    sourceUrl: "https://www.rugby-japan.jp/#sco-2026",
  },

  // ── 同人・即売会・ホビーイベント ──
  {
    title: "文学フリマ東京43",
    occurrences: [{ start: "2026-11-08T12:00:00+09:00", end: "2026-11-08T17:00:00+09:00" }],
    venue: { name: "東京ビッグサイト", address: "東京都江東区有明3-11-1", region: "東京都" },
    categoryName: "その他",
    description: "文学作品の展示即売会。プロ・アマ問わず多彩な“文学”が並ぶ。11月8日開催。",
    sourceUrl: "https://bunfree.net/event/tokyo43/",
  },
  {
    title: "東京コミコン2026",
    occurrences: [{ start: "2026-12-11T10:00:00+09:00", end: "2026-12-13T18:00:00+09:00" }],
    venue: { name: "幕張メッセ", address: "千葉県千葉市美浜区中瀬2-1", region: "千葉県" },
    categoryName: "その他",
    description: "映画・アメコミ・ホビーの祭典。海外セレブのゲストも登壇。12月11〜13日。",
    sourceUrl: "https://tokyocomiccon.jp/#2026",
  },

  // ── テニス・バスケ ──
  {
    title: "木下グループ ジャパンオープンテニス2026",
    occurrences: [{ start: "2026-09-30T11:00:00+09:00", end: "2026-10-06T21:00:00+09:00" }],
    venue: { name: "有明コロシアム", address: "東京都江東区有明2-2-22", region: "東京都" },
    categoryName: "テニス",
    description: "日本唯一のATPツアー大会（旧・楽天ジャパンオープン）。本戦は9月30日〜10月6日。",
    sourceUrl: "https://www.japanopentennis.com/atp/#2026",
  },
  {
    title: "B.LEAGUE 2026-27 開幕戦",
    occurrences: [{ start: "2026-09-22T19:05:00+09:00" }],
    categoryName: "バスケ",
    description: "リーグ刷新「B.革新」初年度の開幕。開幕カードはアルバルク東京 vs 琉球ゴールデンキングス。",
    sourceUrl: "https://www.bleague.jp/opening2026-27/#2026",
  },

  // ── 音楽フェス（ロッキン）──
  {
    title: "ROCK IN JAPAN FESTIVAL 2026",
    // 2週末・計5日間（9/12,13 / 9/19,20,21）
    occurrences: [
      { start: "2026-09-12T11:00:00+09:00" },
      { start: "2026-09-13T11:00:00+09:00" },
      { start: "2026-09-19T11:00:00+09:00" },
      { start: "2026-09-20T11:00:00+09:00" },
      { start: "2026-09-21T11:00:00+09:00" },
    ],
    venue: { name: "千葉市蘇我スポーツ公園", region: "千葉県" },
    categoryName: "フェス",
    description: "国内最大級のロックフェス。9月の2週末・計5日間で約115組が出演。",
    sourceUrl: "https://rijfes.jp/2026/#fes",
  },

  // ── ゲーム発売日（2026.6.9 ニンテンドーダイレクト発表分ほか）──
  {
    title: "ファイナルファンタジー レゾナンス 発売",
    occurrences: [{ start: "2026-10-22T00:00:00+09:00" }],
    categoryName: "発売日",
    description: "FF初のHD-2D作品。Switch2／PS5ほかで発売。",
    sourceUrl: "https://www.jp.square-enix.com/#ff-resonance-2026",
  },
  {
    title: "地球防衛軍5（Nintendo Switch 2）発売",
    occurrences: [{ start: "2026-10-08T00:00:00+09:00" }],
    categoryName: "発売日",
    description: "人気3DアクションシューティングのSwitch 2版。",
    sourceUrl: "https://www.d3p.co.jp/#edf5-switch2-2026",
  },
  {
    title: "東方紅魔郷：New Classic 発売",
    occurrences: [{ start: "2026-09-10T00:00:00+09:00" }],
    categoryName: "発売日",
    description: "「東方Project」第6作のリメイク。各機種で発売。",
    sourceUrl: "manual:game:touhou-koumakyou-newclassic-2026",
  },

  // ── アニメ・声優ライブ ──
  {
    title: "Animelo Summer Live 2026 -Messenger-",
    occurrences: [{ start: "2026-07-10T16:00:00+09:00", end: "2026-07-12T21:00:00+09:00" }],
    venue: { name: "幕張メッセ", address: "千葉県千葉市美浜区中瀬2-1", region: "千葉県" },
    categoryName: "ライブ",
    description: "世界最大級のアニメソングの祭典「アニサマ」。3日間開催。",
    sourceUrl: "https://anisama.tv/#2026",
  },

  // ── ゴルフ・卓球 ──
  {
    title: "日本女子オープンゴルフ選手権2026",
    occurrences: [{ start: "2026-10-01T08:00:00+09:00", end: "2026-10-04T17:00:00+09:00" }],
    venue: { name: "宝塚ゴルフ倶楽部 旧コース", region: "兵庫県" },
    categoryName: "ゴルフ",
    description: "国内女子ゴルフのナショナルオープン。10月1日〜4日。",
    sourceUrl: "https://www.lpga.or.jp/#japan-womens-open-2026",
  },
  {
    title: "ノジマTリーグ 2026-2027 開幕戦",
    occurrences: [{ start: "2026-07-25T13:00:00+09:00" }],
    venue: { name: "新竹県立体育館（台湾）" },
    categoryName: "卓球",
    description: "卓球Tリーグの新シーズン開幕。開幕戦は台湾・新竹で開催。",
    sourceUrl: "https://tleague.jp/#2026-27-opening",
  },

  // ── 舞台（宝塚歌劇）──
  {
    title: "宝塚歌劇 宙組「黒蜥蜴／Diamond IMPULSE」（宝塚大劇場）",
    occurrences: [{ start: "2026-05-23T11:00:00+09:00", end: "2026-07-05T16:00:00+09:00" }],
    venue: { name: "宝塚大劇場", address: "兵庫県宝塚市栄町1-1-57", region: "兵庫県" },
    categoryName: "舞台・演劇",
    description: "宙組公演。江戸川乱歩原作のミステリーとショーの二本立て。会期は7月5日まで。",
    sourceUrl: "https://kageki.hankyu.co.jp/revue/2026/kurotokage/#takarazuka",
  },
  {
    title: "宝塚歌劇 星組「エスペラント」（宝塚大劇場）",
    occurrences: [{ start: "2026-08-29T11:00:00+09:00", end: "2026-10-11T16:00:00+09:00" }],
    venue: { name: "宝塚大劇場", address: "兵庫県宝塚市栄町1-1-57", region: "兵庫県" },
    categoryName: "舞台・演劇",
    description: "星組公演。会期は8月29日〜10月11日。",
    sourceUrl: "https://kageki.hankyu.co.jp/revue/#esperanto-takarazuka-2026",
  },
  {
    title: "宝塚歌劇 星組「エスペラント」（東京宝塚劇場）",
    occurrences: [{ start: "2026-10-31T11:00:00+09:00", end: "2026-12-13T16:00:00+09:00" }],
    venue: { name: "東京宝塚劇場", address: "東京都千代田区有楽町1-1-3", region: "東京都" },
    categoryName: "舞台・演劇",
    description: "星組公演の東京公演。会期は10月31日〜12月13日。",
    sourceUrl: "https://kageki.hankyu.co.jp/revue/#esperanto-tokyo-2026",
  },

  // ── 全国の主要花火大会（2026・各地）──
  ...([
    ["古都ひろさき花火の集い", "2026-06-20", "岩木川河川敷（青森県弘前市）", "青森県"],
    ["港まつり 能代の花火", "2026-07-18", "米代川河川敷（秋田県能代市）", "秋田県"],
    ["沼津夏まつり・狩野川花火大会", "2026-07-25", "狩野川周辺（静岡県沼津市）", "静岡県"],
    ["葛飾納涼花火大会", "2026-07-28", "江戸川河川敷・柴又（東京都葛飾区）", "東京都"],
    ["足利花火大会", "2026-08-01", "渡良瀬川河畔（栃木県足利市）", "栃木県"],
    ["幕張ビーチ花火フェスタ2026", "2026-08-01", "幕張海浜公園（千葉県千葉市美浜区）", "千葉県"],
    ["芦屋サマーカーニバル", "2026-08-01", "芦屋公園・海岸（兵庫県芦屋市）", "兵庫県"],
    ["いわき花火大会", "2026-08-01", "小名浜港（福島県いわき市）", "福島県"],
    ["仙台七夕花火祭", "2026-08-05", "西公園周辺（宮城県仙台市）", "宮城県"],
    ["びわ湖大花火大会", "2026-08-06", "琵琶湖畔（滋賀県大津市）", "滋賀県"],
    ["青森花火大会（ねぶた祭協賛）", "2026-08-07", "青森港（青森県青森市）", "青森県"],
    ["一関夏まつり 磐井川川開き花火大会", "2026-08-07", "磐井川河畔（岩手県一関市）", "岩手県"],
    ["なとり夏まつり 花火大会", "2026-08-08", "下増田（宮城県名取市）", "宮城県"],
    ["按針祭 海の花火大会", "2026-08-10", "伊東海岸（静岡県伊東市）", "静岡県"],
    ["那智勝浦町花火大会", "2026-08-11", "勝浦湾（和歌山県那智勝浦町）", "和歌山県"],
    ["諏訪湖祭湖上花火大会", "2026-08-15", "諏訪湖畔（長野県諏訪市）", "長野県"],
    ["赤川花火大会", "2026-08-15", "赤川河川敷（山形県鶴岡市）", "山形県"],
    ["利根川大花火大会", "2026-09-19", "利根川河川敷（茨城県境町）", "茨城県"],
    ["姫路みなと祭 海上花火大会", "2026-09-20", "姫路港（兵庫県姫路市）", "兵庫県"],
    ["大洗海上花火大会2026", "2026-09-26", "大洗サンビーチ（茨城県大洗町）", "茨城県"],
    ["小山の花火", "2026-10-03", "観晃橋下流（栃木県小山市）", "栃木県"],
    ["こうのす花火大会", "2026-10-10", "荒川河川敷（埼玉県鴻巣市）", "埼玉県"],
    ["ちくせい花火大会2026", "2026-10-17", "鬼怒川河畔（茨城県筑西市）", "茨城県"],
  ] as const).map(([title, date, venue, region]) => ({
    title,
    occurrences: [{ start: `${date}T19:00:00+09:00` }],
    venue: { name: venue, region },
    categoryName: "季節行事",
    description: "夏〜秋の夜空を彩る花火大会。",
    sourceUrl: `manual:hanabi:${date}:${region}:${title}`,
  })),

  // ── 全国の特別展・展覧会（2026・会期もの）──
  ...([
    // [タイトル, 開始, 終了, 会場, 都道府県]
    ["モダン都市生活と竹久夢二", "2026-03-28", "2026-06-21", "京都国立近代美術館", "京都府"],
    ["没後50年 髙島野十郎展", "2026-03-25", "2026-06-21", "大阪中之島美術館", "大阪府"],
    ["みやこのかたち", "2026-06-27", "2026-08-23", "奈良県立美術館", "奈良県"],
    ["マリメッコ展（京都文化博物館）", "2026-07-04", "2026-09-06", "京都府京都文化博物館", "京都府"],
    ["テート美術館 YBA & BEYOND", "2026-06-03", "2026-09-06", "京都市京セラ美術館", "京都府"],
    ["大ゴッホ展 夜のカフェテラス", "2026-05-29", "2026-08-12", "上野の森美術館", "東京都"],
    ["エットレ・ソットサス展", "2026-06-23", "2026-10-04", "アーティゾン美術館", "東京都"],
    ["瀧口修造 書くことと描くこと", "2026-06-23", "2026-10-04", "アーティゾン美術館", "東京都"],
    ["ジャム・セッション 石橋財団コレクション×藤井光", "2026-10-24", "2027-01-31", "アーティゾン美術館", "東京都"],
    ["モネ×現代アート", "2026-06-17", "2027-04-07", "ポーラ美術館", "神奈川県"],
    ["カフェに集う芸術家", "2026-06-13", "2026-09-23", "三菱一号館美術館", "東京都"],
    ["ロン・ミュエク", "2026-04-29", "2026-09-23", "森美術館", "東京都"],
    ["アンドリュー・ワイエス展", "2026-04-28", "2026-07-05", "東京都美術館", "東京都"],
  ] as const).map(([title, start, end, venue, region]) => ({
    title,
    occurrences: [{ start: `${start}T10:00:00+09:00`, end: `${end}T18:00:00+09:00` }],
    venue: { name: venue, region },
    categoryName: "美術展",
    description: "話題の特別展・展覧会。",
    sourceUrl: `manual:art:${start}:${title}`,
  })),
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
