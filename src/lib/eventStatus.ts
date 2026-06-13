import { jstMidnightUtc, jstParts, todayJst } from "@/lib/calendar";

// 「まだ終わっていない」開催回を取るための Prisma where 断片。
//  ・複数日(endsAt あり)：終了がこれから（endsAt >= now）= 開催中 or これから → 含める
//  ・単日(endsAt なし)：開始が今日0時以降 = 本日 or これから → 含める
//  ・過去に終わったもの（endsAt < now、または昨日以前の単日）は除外される。
// orderBy: { startsAt: "asc" } と併用すると、開催中（開始が過去）が自然と先頭に並ぶ。
export function activeOccurrenceFilter(now: Date = new Date()) {
  const t = todayJst();
  const todayMidnight = jstMidnightUtc(t.y, t.m, t.d);
  return {
    OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: todayMidnight } }],
  };
}

// 「開催中」= 複数日イベントで、すでに始まっていて、まだ終わっていない。
export function isOngoing(
  occ: { startsAt: Date; endsAt: Date | null },
  now: Date = new Date(),
): boolean {
  return occ.endsAt != null && occ.startsAt <= now && occ.endsAt >= now;
}

// 「開催中 〜M/D」表示用の終了日ラベル（JST）。
export function endLabel(endsAt: Date | null): string {
  if (!endsAt) return "";
  const p = jstParts(endsAt);
  return `${p.m + 1}/${p.d}`;
}

// 開催回の配列を「イベント単位」に重複排除する。
// 例：大相撲は15日分の開催回を持つが、近日開催では1件だけ見せたい。
// 入力が startsAt 昇順なら、各イベントの最も早い回（＝直近）が残る。
export function dedupeByEvent<T extends { event: { id: string } }>(occs: T[], limit?: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const o of occs) {
    if (seen.has(o.event.id)) continue;
    seen.add(o.event.id);
    out.push(o);
    if (limit && out.length >= limit) break;
  }
  return out;
}
