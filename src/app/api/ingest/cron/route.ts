import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedIngest } from "@/lib/ingest/secret";
import { ingestHolidays } from "@/lib/ingest/holidays";
import { ingestIcal } from "@/lib/ingest/ical";
import { ingestRss } from "@/lib/ingest/rss";
import { ingestWithAi } from "@/lib/ingest/ai";
import { ICAL_FEEDS, RSS_FEEDS, AI_SOURCES } from "@/lib/ingest/feeds";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 複数フィード巡回のため長めに（Vercelの上限内）

// 定期取り込みのまとめ実行口。Vercel Cron から1日1回叩く想定。
// 祝日（無設定で動く）＋ feeds.ts に登録した iCal/RSS を順に取り込む。
// 1つのフィードが失敗しても他は続行し、結果サマリを返す。
async function handle(req: NextRequest) {
  if (!authorizedIngest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ical: unknown[] = [];
  const rss: unknown[] = [];
  let holidays: unknown;

  try {
    holidays = await ingestHolidays();
  } catch (e) {
    holidays = { error: String(e) };
  }

  for (const f of ICAL_FEEDS) {
    try {
      const result = await ingestIcal({
        url: f.url,
        sourceName: f.name,
        categoryName: f.category,
        publish: f.publish ?? true,
        includeDescription: f.includeDescription,
      });
      ical.push({ name: f.name, result });
    } catch (e) {
      ical.push({ name: f.name, error: String(e) });
    }
  }

  for (const f of RSS_FEEDS) {
    try {
      const cat = f.category
        ? await prisma.category.findFirst({ where: { name: f.category } })
        : null;
      const result = await ingestRss({
        url: f.url,
        sourceName: f.name,
        categoryIds: cat ? [cat.id] : [],
      });
      rss.push({ name: f.name, result });
    } catch (e) {
      rss.push({ name: f.name, error: String(e) });
    }
  }

  // AI抽出：全ソースを毎日叩くとコスト高＆maxDuration(60s)に当たるので、
  // 曜日でソースを分散（i % 7 === 今日のJST曜日）し、1週間で一巡させる。
  // ?ai=1 を付けると分散を無視して全ソースを即時実行（手動テスト用）。
  const ai: unknown[] = [];
  const forceAi = new URL(req.url).searchParams.get("ai") === "1";
  if (process.env.ANTHROPIC_API_KEY && AI_SOURCES.length > 0) {
    const jstWeekday = new Date(Date.now() + 9 * 3600 * 1000).getUTCDay(); // 0=日..6=土（JST）
    const todays = forceAi ? AI_SOURCES : AI_SOURCES.filter((_, i) => i % 7 === jstWeekday);
    for (const s of todays) {
      try {
        const cat = s.category
          ? await prisma.category.findFirst({ where: { name: s.category } })
          : null;
        const result = await ingestWithAi({
          url: s.url,
          sourceName: s.name,
          categoryIds: cat ? [cat.id] : [],
        });
        ai.push({ name: s.name, result });
      } catch (e) {
        ai.push({ name: s.name, error: String(e) });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    holidays,
    icalFeeds: ICAL_FEEDS.length,
    ical,
    rssFeeds: RSS_FEEDS.length,
    rss,
    aiSources: AI_SOURCES.length,
    aiRan: ai.length,
    ai,
  });
}

export const GET = handle;
export const POST = handle;
