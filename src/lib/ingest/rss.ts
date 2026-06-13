import type { SubmissionPayload } from "@/lib/submission";
import { enqueueSubmissions } from "./submissions";
import type { IngestResult } from "./holidays";

// RSS 2.0 / Atom フィードの取り込み（APIキー不要）。
// 記事のタイトル・本文から開催日を機械的に抽出できた項目だけを審査キューに入れる。
// 日付が読み取れない記事はスキップ（誤った日付で登録するより安全）。

export type FeedItem = {
  title: string;
  link: string;
  description: string;
};

function pick(tagBody: string, tag: string): string | null {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(tagBody);
  return m ? m[1].trim() : null;
}

function stripHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  // RSS 2.0: <item>、Atom: <entry>
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const b of blocks) {
    const title = pick(b, "title");
    if (!title) continue;
    // Atom の link は <link href="..."/> 形式
    const atomLink = /<link[^>]*href="([^"]+)"/i.exec(b)?.[1];
    const link = atomLink ?? pick(b, "link") ?? "";
    const description = pick(b, "description") ?? pick(b, "summary") ?? pick(b, "content") ?? "";
    items.push({ title: stripHtml(title), link: stripHtml(link), description: stripHtml(description) });
  }
  return items;
}

// 日本語テキストから開催日時を抽出（JST）。見つからなければ null。
export function extractJstDate(text: string): string | null {
  const now = new Date();
  const thisYear = now.getFullYear();

  // 1) 2026年7月1日（任意で 19:00 / 19時30分）
  let m = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日(?:[^\d]{0,8}(\d{1,2})[:時](\d{2})?)?/.exec(text);
  // 2) 2026/7/1, 2026-07-01
  if (!m) {
    const m2 = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(text);
    if (m2) m = [...m2, undefined, undefined] as unknown as RegExpExecArray;
  }
  let y: number, mo: number, d: number, h = 0, mi = 0;
  if (m) {
    y = +m[1];
    mo = +m[2];
    d = +m[3];
    if (m[4]) h = +m[4];
    if (m[5]) mi = +m[5];
  } else {
    // 3) 7月1日（年なし → 今年。過去なら来年）
    const m3 = /(\d{1,2})月\s*(\d{1,2})日(?:[^\d]{0,8}(\d{1,2})[:時](\d{2})?)?/.exec(text);
    if (!m3) return null;
    mo = +m3[1];
    d = +m3[2];
    if (m3[3]) h = +m3[3];
    if (m3[4]) mi = +m3[4];
    y = thisYear;
    const candidate = new Date(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+09:00`);
    if (candidate.getTime() < now.getTime() - 86400000) y += 1;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00+09:00`;
}

export function feedItemsToPayloads(
  items: FeedItem[],
  sourceName: string,
  categoryIds: string[],
): SubmissionPayload[] {
  const out: SubmissionPayload[] = [];
  for (const it of items) {
    if (!it.link) continue;
    const date = extractJstDate(`${it.title} ${it.description}`);
    if (!date) continue; // 開催日が読めない記事は入れない
    out.push({
      title: it.title,
      startsAt: new Date(date).toISOString(),
      endsAt: null,
      venueName: null,
      venueAddress: null,
      venueRegion: null,
      description: it.description.slice(0, 500) || null,
      categoryIds,
      origin: "rss",
      sourceName,
      sourceUrl: it.link,
    });
  }
  return out;
}

export async function ingestRss(opts: {
  url: string;
  sourceName: string;
  categoryIds?: string[];
}): Promise<IngestResult & { noDate: number }> {
  const res = await fetch(opts.url, {
    cache: "no-store",
    headers: { "User-Agent": "EventCalendar/1.0" },
  });
  if (!res.ok) throw new Error(`RSSの取得に失敗しました (HTTP ${res.status})`);
  const xml = await res.text();
  const items = parseFeed(xml);
  const payloads = feedItemsToPayloads(items, opts.sourceName, opts.categoryIds ?? []);
  const result = await enqueueSubmissions(payloads);
  return { ...result, scanned: items.length, noDate: items.length - payloads.length };
}
