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
    category: "公開日",
    publish: true,
    includeDescription: false,
  },
];

// RSS は抽出精度が低いため、取り込み結果は「審査キュー」に入る（自動公開しない）。
//   { name: "○○美術館 新着", url: "https://example.jp/news/feed", category: "美術展" },
export const RSS_FEEDS: RssFeed[] = [];
