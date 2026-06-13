import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestRss } from "@/lib/ingest/rss";
import { authorizedIngest } from "@/lib/ingest/secret";

export const dynamic = "force-dynamic";

// 使い方: /api/ingest/rss?secret=...&url=<RSS/AtomのURL>&name=<表示名>&category=<カテゴリ名>
// 抽出した候補は「審査キュー」に入る（自動公開はしない）。
async function handle(req: NextRequest) {
  if (!authorizedIngest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const url = sp.get("url");
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "url（http/httpsのフィード）が必要です" }, { status: 400 });
  }
  const sourceName = sp.get("name") ?? "RSSフィード";
  const categoryName = sp.get("category");
  const cat = categoryName
    ? await prisma.category.findFirst({ where: { name: categoryName } })
    : null;

  try {
    const result = await ingestRss({ url, sourceName, categoryIds: cat ? [cat.id] : [] });
    return NextResponse.json({ ok: true, source: sourceName, mode: "審査キューへ", ...result });
  } catch (e) {
    console.error("[ingest:rss]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
