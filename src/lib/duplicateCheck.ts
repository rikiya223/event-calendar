import { prisma } from "@/lib/prisma";

// 機械的な重複チェック（仕様 3.1-7 / 7章 STEP1-2 の簡易版）。
// AIは使わず、「開催日±1日」かつ「同会場 or 類似タイトル」を管理者に警告する。

const DAY_MS = 86_400_000;
const TITLE_SIMILARITY_THRESHOLD = 0.4;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　・,.、。!！?？\-―ー~〜「」『』()（）]/g, "");
}

// 文字バイグラムの Jaccard 類似度（日本語の表記揺れに強い簡易指標）
function titleSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  const grams = (s: string) => {
    const g = new Set<string>();
    if (s.length === 1) g.add(s);
    for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2));
    return g;
  };
  const A = grams(na);
  const B = grams(nb);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export type DuplicateWarning = {
  eventId: string;
  title: string;
  startsAt: Date;
  reasons: string[];
};

// 候補イベントを抽出して、同一らしい根拠（reasons）付きで返す
export async function findPotentialDuplicates(input: {
  title: string;
  startsAt: string | Date;
  venueName?: string | null;
}): Promise<DuplicateWarning[]> {
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return [];

  // STEP1: ブロッキング（開催日±1日の開催回だけに絞る）
  const from = new Date(start.getTime() - DAY_MS);
  const to = new Date(start.getTime() + DAY_MS);
  const occurrences = await prisma.eventOccurrence.findMany({
    where: { startsAt: { gte: from, lte: to } },
    include: { event: { include: { venue: true } } },
  });

  // STEP2: 機械的スコアリング（同会場・類似タイトル）
  const seen = new Map<string, DuplicateWarning>();
  const venueNorm = input.venueName ? normalize(input.venueName) : "";

  for (const occ of occurrences) {
    const ev = occ.event;
    if (seen.has(ev.id)) continue;

    const reasons: string[] = [];
    if (venueNorm && ev.venue && normalize(ev.venue.name) === venueNorm) {
      reasons.push(`同会場（${ev.venue.name}）`);
    }
    const sim = titleSimilarity(input.title, ev.canonicalTitle);
    if (sim >= TITLE_SIMILARITY_THRESHOLD) {
      reasons.push(`類似タイトル（${ev.canonicalTitle}）`);
    }

    if (reasons.length > 0) {
      reasons.unshift("開催日が近い");
      seen.set(ev.id, {
        eventId: ev.id,
        title: ev.canonicalTitle,
        startsAt: occ.startsAt,
        reasons,
      });
    }
  }

  return [...seen.values()];
}
