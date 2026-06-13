import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestWithAi } from "@/lib/ingest/ai";
import { authorizedIngest } from "@/lib/ingest/secret";

export const dynamic = "force-dynamic";

// 使い方: /api/ingest/ai?secret=...&url=<ページのURL>&name=<表示名>&category=<カテゴリ名>
// ClaudeがページからイベントをJSON抽出 → 審査キューへ（自動公開はしない）。
// 要 ANTHROPIC_API_KEY。モデルは AI_INGEST_MODEL で変更可（既定: claude-opus-4-8）。
async function handle(req: NextRequest) {
  if (!authorizedIngest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const url = sp.get("url");
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "url（http/https）が必要です" }, { status: 400 });
  }
  const sourceName = sp.get("name") ?? "AI抽出";
  const categoryName = sp.get("category");
  const cat = categoryName
    ? await prisma.category.findFirst({ where: { name: categoryName } })
    : null;

  try {
    const result = await ingestWithAi({ url, sourceName, categoryIds: cat ? [cat.id] : [] });
    return NextResponse.json({ ok: true, source: sourceName, mode: "審査キューへ", ...result });
  } catch (e) {
    console.error("[ingest:ai]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
