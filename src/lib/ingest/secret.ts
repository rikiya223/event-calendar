import { type NextRequest } from "next/server";

// 取り込みルート共通の認証。
//  ・手動実行：?secret=<INGEST_SECRET> または Authorization: Bearer <INGEST_SECRET>
//  ・Vercel Cron：実行時に Authorization: Bearer <CRON_SECRET> を自動付与するので、
//    CRON_SECRET を環境変数に設定しておけば cron からのアクセスも許可される。
export function authorizedIngest(req: NextRequest): boolean {
  const secrets = [process.env.INGEST_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => !!s,
  );
  if (secrets.length === 0) return false;
  const header = req.headers.get("authorization");
  const query = new URL(req.url).searchParams.get("secret");
  return secrets.some((s) => header === `Bearer ${s}` || query === s);
}
