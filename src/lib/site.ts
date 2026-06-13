// サイト全体のメタ情報。SEO/OGP・sitemap・robots から参照する。
export const SITE_NAME = "イベントカレンダー";
export const SITE_DESCRIPTION =
  "日本のイベントをカレンダーで発見。展覧会・ライブ・フェス・スポーツ・映画公開日・祝日まで、気になる予定をまとめてチェックできます。";

// 本番URL。NEXT_PUBLIC_SITE_URL があれば最優先、無ければ Vercel が自動で渡す
// VERCEL_URL、それも無ければローカル。末尾スラッシュは落とす。
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
