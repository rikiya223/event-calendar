import Anthropic from "@anthropic-ai/sdk";
import type { SubmissionPayload } from "@/lib/submission";
import { enqueueSubmissions } from "./submissions";
import type { IngestResult } from "./holidays";

// AIによる半自動抽出：Webページ/フィードのテキストをClaudeに渡し、
// イベント情報を構造化出力（JSON Schema）で抽出 → 審査キューへ（自動公開はしない）。
// モデルは AI_INGEST_MODEL で変更可（既定: claude-opus-4-8）。

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "イベント名（簡潔に）" },
          starts_at: {
            type: "string",
            description: "開始日時。ISO 8601 で日本時間 (+09:00)。時刻不明なら 00:00",
          },
          ends_at: {
            type: ["string", "null"],
            description: "終了日時 (ISO 8601, +09:00)。不明なら null",
          },
          venue_name: { type: ["string", "null"], description: "会場名。不明なら null" },
          region: { type: ["string", "null"], description: "開催都道府県（例: 東京都）。不明なら null" },
          description: { type: ["string", "null"], description: "1〜2文の説明。不明なら null" },
        },
        required: ["title", "starts_at", "ends_at", "venue_name", "region", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["events"],
  additionalProperties: false,
} as const;

type ExtractedEvent = {
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  region: string | null;
  description: string | null;
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function ingestWithAi(opts: {
  url: string;
  sourceName: string;
  categoryIds?: string[];
}): Promise<IngestResult & { extracted: number }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY が未設定です。");
  }

  const res = await fetch(opts.url, {
    cache: "no-store",
    headers: { "User-Agent": "EventCalendar/1.0" },
  });
  if (!res.ok) throw new Error(`ページの取得に失敗しました (HTTP ${res.status})`);
  const text = htmlToText(await res.text()).slice(0, 30000);

  const client = new Anthropic();
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

  const response = await client.messages.create({
    // 定期巡回でコストを抑えるため既定は Haiku。精度が足りなければ
    // 環境変数 AI_INGEST_MODEL で Sonnet/Opus に上げられる。
    model: process.env.AI_INGEST_MODEL || "claude-haiku-4-5-20251001",
    max_tokens: 16000,
    system:
      `あなたはイベント情報の抽出器です。与えられたWebページのテキストから、今後開催される実在のイベント（公演・展示・試合・発売日など）だけを抽出してください。` +
      `今日は ${today}（日本時間）です。過去のイベント、日付が特定できないもの、広告やナビゲーションは含めないでください。` +
      `日時は必ず日本時間（+09:00）の ISO 8601 で出力してください。確信が持てない項目は null にしてください。`,
    messages: [{ role: "user", content: `取得元URL: ${opts.url}\n\n--- ページ本文 ---\n${text}` }],
    output_config: { format: { type: "json_schema", schema: EXTRACT_SCHEMA } },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AIの応答からテキストを取得できませんでした。");
  }
  const parsed = JSON.parse(textBlock.text) as { events: ExtractedEvent[] };

  const payloads: SubmissionPayload[] = parsed.events
    .filter((e) => e.title && e.starts_at && !Number.isNaN(new Date(e.starts_at).getTime()))
    .map((e) => ({
      title: e.title,
      startsAt: new Date(e.starts_at).toISOString(),
      endsAt: e.ends_at && !Number.isNaN(new Date(e.ends_at).getTime()) ? new Date(e.ends_at).toISOString() : null,
      venueName: e.venue_name,
      venueAddress: null,
      venueRegion: e.region,
      description: e.description,
      categoryIds: opts.categoryIds ?? [],
      origin: "ai",
      sourceName: opts.sourceName,
      // 同じページから同名イベントを再抽出しても重複しないよう安定キーにする
      sourceUrl: `${opts.url}#${encodeURIComponent(e.title)}`,
    }));

  const result = await enqueueSubmissions(payloads);
  return { ...result, extracted: parsed.events.length };
}
