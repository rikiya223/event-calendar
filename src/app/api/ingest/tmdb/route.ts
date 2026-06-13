import { NextResponse, type NextRequest } from "next/server";
import { ingestTmdbMovies } from "@/lib/ingest/tmdb";
import { authorizedIngest } from "@/lib/ingest/secret";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  if (!authorizedIngest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await ingestTmdbMovies();
    return NextResponse.json({ ok: true, source: "TMDb映画", ...result });
  } catch (e) {
    console.error("[ingest:tmdb]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
