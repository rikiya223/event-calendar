import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 検索エンジン向けクロール許可。ログイン後/管理/APIなどは除外。
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // クエリ付きURL（/calendar?date=...&ex=... など）は無限に組み合わせが増えるためクロール拒否。
      // クリーンURL（/calendar, /events/[id]）だけを巡回させ、無駄な動的レンダリング＝転送量を抑える。
      disallow: ["/admin", "/api/", "/mypage", "/login", "/reset", "/*?"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
