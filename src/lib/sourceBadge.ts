import type { SourceType } from "@prisma/client";

// イベントの取得元を人が読めるラベルに変換（管理画面のバッジ用）。
export function sourceBadgeLabel(sourceType: SourceType, sourceUrl?: string | null): string {
  switch (sourceType) {
    case "MANUAL":
      return "手動";
    case "USER":
      return "投稿";
    case "AI_AGENT":
      return "AI抽出";
    case "SCRAPING":
      return "スクレイピング";
    case "OFFICIAL_API": {
      const u = sourceUrl ?? "";
      if (u.startsWith("caogov:")) return "祝日";
      if (u.includes("themoviedb.org")) return "TMDb";
      if (u.startsWith("ical:")) return "iCal";
      if (u.startsWith("http")) return "フィード";
      return "公式API";
    }
    default:
      return String(sourceType);
  }
}

// 審査キュー（payload.origin）用
export function originBadgeLabel(origin?: string | null): string {
  if (origin === "rss") return "RSS";
  if (origin === "ai") return "AI抽出";
  return "ユーザー投稿";
}
