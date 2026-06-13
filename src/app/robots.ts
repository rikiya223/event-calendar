import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 検索エンジン向けクロール許可。ログイン後/管理/APIなどは除外。
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/mypage", "/login", "/reset"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
