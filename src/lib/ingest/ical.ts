import { prisma } from "@/lib/prisma";
import { findOrCreateVenue } from "@/lib/events";
import type { IngestResult } from "./holidays";

// iCal(.ics)フィードの取り込み（APIキー不要）。
// 会場・団体・自治体が公開する公開カレンダー(.ics)のURLを指定して使う。

type VEvent = {
  uid: string;
  summary: string;
  start: Date;
  end: Date | null;
  location: string | null;
  description: string | null;
};

function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// iCalの日時を Date に変換。日本のフィード前提で、TZ未指定/Asia/Tokyo は JST、末尾Z は UTC。
function parseICalDate(value: string, params: string[]): Date | null {
  const isDate = params.some((p) => p.toUpperCase() === "VALUE=DATE") || /^\d{8}$/.test(value);
  if (isDate) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(value);
    if (!m) return null;
    return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+09:00`); // 終日はJST 0時
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`); // UTC
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`); // TZID=Asia/Tokyo / 未指定 → JST
}

export function parseICS(text: string): VEvent[] {
  // 行折り返し(フォールディング)を結合してから行分割
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: VEvent[] = [];
  let cur: Record<string, { value: string; params: string[] }> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const get = (k: string) => cur![k];
        const summary = get("SUMMARY")?.value;
        const dtstart = get("DTSTART");
        if (summary && dtstart) {
          const start = parseICalDate(dtstart.value, dtstart.params);
          const dtend = get("DTEND");
          const end = dtend ? parseICalDate(dtend.value, dtend.params) : null;
          if (start) {
            events.push({
              uid: get("UID")?.value || `${summary}-${dtstart.value}`,
              summary: unescapeText(summary).trim(),
              start,
              end,
              location: get("LOCATION") ? unescapeText(get("LOCATION").value).trim() : null,
              description: get("DESCRIPTION") ? unescapeText(get("DESCRIPTION").value).trim() : null,
            });
          }
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...params] = left.split(";");
    cur[name.toUpperCase()] = { value, params };
  }
  return events;
}

export async function ingestIcal(opts: {
  url: string;
  sourceName: string;
  categoryName?: string;
  publish?: boolean; // true=公開、false=審査待ち（既定: true）
  includeDescription?: boolean; // false=説明文を保存しない（著作権配慮。既定: true）
}): Promise<IngestResult> {
  const res = await fetch(opts.url, { cache: "no-store", headers: { "User-Agent": "EventCalendar/1.0" } });
  if (!res.ok) throw new Error(`iCalの取得に失敗しました (HTTP ${res.status})`);
  const text = await res.text();
  const events = parseICS(text);

  const cat = opts.categoryName
    ? await prisma.category.findFirst({ where: { name: opts.categoryName } })
    : null;
  const status = opts.publish === false ? "PENDING_REVIEW" : "PUBLISHED";

  // 既存チェックは1クエリでまとめて行う（フィードが大きくても速い）
  const keys = events.map((e) => `ical:${e.uid}`);
  const existingRows = await prisma.eventSource.findMany({
    where: { sourceType: "OFFICIAL_API", sourceUrl: { in: keys } },
    select: { sourceUrl: true },
  });
  const existing = new Set(existingRows.map((r) => r.sourceUrl));
  const toCreate = events.filter((e) => !existing.has(`ical:${e.uid}`));

  // 書き込みは少しずつ並列化（リモートDBの往復待ちを短縮）
  const CONCURRENCY = 5;
  for (let i = 0; i < toCreate.length; i += CONCURRENCY) {
    await Promise.all(
      toCreate.slice(i, i + CONCURRENCY).map(async (ev) => {
        const venue = ev.location ? await findOrCreateVenue(ev.location) : null;
        // 終日/公開日のiCal慣習（DTEND=翌0時）は単日として扱い、会期中表示を防ぐ
        let end = ev.end;
        if (end) {
          const endIsJstMidnight = (end.getTime() + 9 * 3_600_000) % 86_400_000 === 0;
          if (endIsJstMidnight && end.getTime() - ev.start.getTime() <= 86_400_000) end = null;
        }
        await prisma.event.create({
          data: {
            canonicalTitle: ev.summary,
            description: opts.includeDescription === false ? null : ev.description,
            status,
            confidenceScore: 70,
            venueId: venue?.id ?? null,
            occurrences: { create: { startsAt: ev.start, endsAt: end } },
            sources: {
              create: {
                sourceType: "OFFICIAL_API",
                sourceUrl: `ical:${ev.uid}`,
                trustWeight: 70,
                rawPayload: { uid: ev.uid, summary: ev.summary, feed: opts.sourceName, feedUrl: opts.url },
              },
            },
            eventCategories: cat ? { create: [{ categoryId: cat.id }] } : undefined,
          },
        });
      }),
    );
  }

  return { created: toCreate.length, skipped: events.length - toCreate.length, scanned: events.length };
}
