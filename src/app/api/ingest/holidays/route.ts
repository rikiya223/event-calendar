import { NextResponse, type NextRequest } from "next/server";
import { ingestHolidays } from "@/lib/ingest/holidays";
import { authorizedIngest } from "@/lib/ingest/secret";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  if (!authorizedIngest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await ingestHolidays();
    return NextResponse.json({ ok: true, source: "祝日", ...result });
  } catch (e) {
    console.error("[ingest:holidays]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
