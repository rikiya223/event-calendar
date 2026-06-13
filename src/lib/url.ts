// オープンリダイレクト対策：相対パス（/ で始まり // でない）だけ許可する。
export function safeNext(next?: string | null, fallback = "/mypage"): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return fallback;
}
