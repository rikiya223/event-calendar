import { prisma } from "@/lib/prisma";

// 内閣府が公開している「国民の祝日」CSV（Shift-JIS）。APIキー不要・公開データ。
const CAO_URL = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv";

function toIsoDate(s: string): string | null {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

export type IngestResult = { created: number; skipped: number; scanned: number };

// 祝日を取り込む。再実行しても重複しないよう、各祝日に安定キー（source_url）を付けて冪等にする。
export async function ingestHolidays(): Promise<IngestResult> {
  const res = await fetch(CAO_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`祝日CSVの取得に失敗しました (HTTP ${res.status})`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder("shift_jis").decode(buf);
  const lines = text.split(/\r?\n/).slice(1).filter(Boolean); // 先頭はヘッダー

  const thisYear = new Date().getFullYear();
  const holidayCat = await prisma.category.findFirst({ where: { name: "祝日" } });

  let created = 0;
  let skipped = 0;
  let scanned = 0;

  for (const line of lines) {
    const [dateRaw, nameRaw] = line.split(",");
    const iso = toIsoDate(dateRaw ?? "");
    const name = (nameRaw ?? "").trim();
    if (!iso || !name) continue;
    if (Number(iso.slice(0, 4)) < thisYear) continue; // 今年以降のみ取り込む
    scanned++;

    const sourceUrl = `caogov:holiday:${iso}`;
    const existing = await prisma.eventSource.findFirst({
      where: { sourceType: "OFFICIAL_API", sourceUrl },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.event.create({
      data: {
        canonicalTitle: name,
        description: "国民の祝日（内閣府データ）",
        status: "PUBLISHED", // 公式・高信頼なので自動公開（仕様 5.4）
        confidenceScore: 90,
        occurrences: { create: { startsAt: new Date(`${iso}T00:00:00+09:00`), endsAt: null } },
        sources: {
          create: {
            sourceType: "OFFICIAL_API",
            sourceUrl,
            trustWeight: 90,
            rawPayload: { date: iso, name, source: "cao.go.jp" },
          },
        },
        eventCategories: holidayCat ? { create: [{ categoryId: holidayCat.id }] } : undefined,
      },
    });
    created++;
  }

  return { created, skipped, scanned };
}
