import { NextResponse, type NextRequest } from "next/server";
import { ingestIcal } from "@/lib/ingest/ical";
import { authorizedIngest } from "@/lib/ingest/secret";

export const dynamic = "force-dynamic";

// 使い方:
//   /api/ingest/ical?secret=...&url=<.icsのURL>&name=<表示名>&category=<カテゴリ名>&publish=1
//   publish=0 で「審査待ち」として取り込む（半自動）。
async function handle(req: NextRequest) {
  if (!authorizedIngest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const url = sp.get("url");
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "url（http/httpsの.ics）が必要です" }, { status: 400 });
  }
  const sourceName = sp.get("name") ?? "iCalフィード";
  const categoryName = sp.get("category") ?? undefined;
  const publish = sp.get("publish") !== "0";

  try {
    const result = await ingestIcal({ url, sourceName, categoryName, publish });
    return NextResponse.json({ ok: true, source: sourceName, publish, ...result });
  } catch (e) {
    console.error("[ingest:ical]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
