// 定期取り込み（/api/ingest/cron）が巡回するフィードの登録表。
// ここに追加するだけで cron の対象になる。URL は各団体の「公式」フィードを使うこと
// （集約サイトのスクレイピングは不可）。category はカテゴリ名（seed のものと一致させる）。

export type IcalFeed = {
  name: string; // 取得元の表示名（バッジ・出典に使う）
  url: string; // 公開 .ics の URL
  category?: string; // 紐付けるカテゴリ名（例: "サッカー" "美術展"）
  publish?: boolean; // true=即公開 / false=審査キュー（既定 true）
  includeDescription?: boolean; // false=説明文を保存しない（他社の文章を複製しない。既定 true）
};

export type RssFeed = {
  name: string;
  url: string; // RSS / Atom の URL
  category?: string;
};

export const ICAL_FEEDS: IcalFeed[] = [
  // 映画.com 公開予定スケジュール（公式iCal）。日付・作品名のみ取り込み、
  // あらすじ（著作物）は保存しない（includeDescription: false）。
  {
    name: "映画.com 公開予定",
    url: "https://eiga.com/movie/coming.ics",
    category: "映画公開日",
    publish: true,
    includeDescription: false,
  },
];

// RSS は抽出精度が低いため、取り込み結果は「審査キュー」に入る（自動公開しない）。
//   { name: "○○美術館 新着", url: "https://example.jp/news/feed", category: "美術展" },
export const RSS_FEEDS: RssFeed[] = [];

export type AiSource = {
  name: string; // 取得元の表示名（出典バッジに使う）
  url: string; // 公式の「一覧/スケジュール」ページ
  category?: string; // 紐付けるカテゴリ名（seed のものと一致させる）
};

// AI抽出の定期巡回対象。日次cronが曜日でこの配列を分散巡回し（1日数本→1週間で一巡）、
// Claude が本文からイベントを抽出して審査キュー(PENDING)へ積む（自動公開しない）。
// 追加はここに1行足すだけ。注意：
//  - JSで描画するSPAは本文が取れず0件になる → 取り込み0件が続くソースは外す（cronの応答で確認できる）。
//  - 出典は必ず各団体の「公式」ページ。集約サイトのスクレイピングは不可。
export const AI_SOURCES: AiSource[] = [
  // 美術展（公式の展覧会一覧。いずれもSSRで本文が取得できることを確認済み）
  { name: "森美術館 展覧会", url: "https://www.mori.art.museum/jp/exhibitions/", category: "美術展" },
  { name: "国立新美術館 展覧会", url: "https://www.nact.jp/exhibition_special/", category: "美術展" },
  { name: "東京国立近代美術館 展覧会", url: "https://www.momat.go.jp/exhibitions", category: "美術展" },
  { name: "横浜美術館 展覧会", url: "https://yokohama.art.museum/exhibition/", category: "美術展" },
  { name: "大阪中之島美術館 スケジュール", url: "https://www.nakka-art.jp/schedule/", category: "美術展" },
  // 追加するときは先に /api/ingest/ai?secret=...&url=... で本文が取れる（=0件でない）か確認すること。
  // 403/JS必須のサイトは plain fetch で取れず0件になる（例: サントリー美術館は403）。
];
