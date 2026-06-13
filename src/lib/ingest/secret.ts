import { type NextRequest } from "next/server";

// 取り込みルート共通の認証。?secret=... または Authorization: Bearer ...
export function authorizedIngest(req: NextRequest): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const query = new URL(req.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || query === secret;
}
