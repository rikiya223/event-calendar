// 定期取り込み（/api/ingest/cron）が巡回するフィードの登録表。
// ここに追加するだけで cron の対象になる。URL は各団体の「公式」フィードを使うこと
// （集約サイトのスクレイピングは不可）。category はカテゴリ名（seed のものと一致させる）。

export type IcalFeed = {
  name: string; // 取得元の表示名（バッジ・出典に使う）
  url: string; // 公開 .ics の URL
  category?: string; // 紐付けるカテゴリ名（例: "サッカー" "美術展"）
  publish?: boolean; // true=即公開 / false=審査キュー（既定 true）
};

export type RssFeed = {
  name: string;
  url: string; // RSS / Atom の URL
  category?: string;
};

// 例（コメントを外して実在の公式フィードURLに置き換える）:
//   { name: "Jリーグ 日程", url: "https://example.jp/schedule.ics", category: "サッカー", publish: true },
export const ICAL_FEEDS: IcalFeed[] = [];

// RSS は抽出精度が低いため、取り込み結果は「審査キュー」に入る（自動公開しない）。
//   { name: "○○美術館 新着", url: "https://example.jp/news/feed", category: "美術展" },
export const RSS_FEEDS: RssFeed[] = [];
