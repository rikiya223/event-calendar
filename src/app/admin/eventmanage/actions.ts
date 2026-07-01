"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { parseCsv } from "@/lib/csv";
import { createEventFromPayload } from "@/lib/events";
import { createIdeaFromPayload } from "@/lib/ideas";

export type ImportResult = {
  ok: boolean;
  created: number;
  failed: number;
  errors: string[]; // 「3行目: タイトルが空です」等
};

// "YYYY-MM-DD" または "YYYY-MM-DD HH:mm"(JST) を UTC Date に。不正なら null。
function parseJstDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const date = new Date(`${y}-${mo}-${d}T${h ?? "00"}:${mi ?? "00"}:00+09:00`);
  return isNaN(date.getTime()) ? null : date;
}

function parseIntOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

// カテゴリ名（"|"区切りで複数可）→ id配列。見つからない名前は無視する。
async function resolveCategoryIds(
  raw: string,
  nameToId: Map<string, string>,
): Promise<string[]> {
  return raw
    .split("|")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((name) => nameToId.get(name))
    .filter((v): v is string => Boolean(v));
}

async function categoryMap(): Promise<Map<string, string>> {
  const cats = await prisma.category.findMany({ select: { id: true, name: true } });
  return new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
}

// ── イベントのCSV一括投入 ──────────────────────────────────
// 列: title, startsAt(必須), description, endsAt, venueName, region, category
export async function importEventsFromCsv(
  csvText: string,
  publish: boolean,
): Promise<ImportResult> {
  await requireAdmin();
  const { rows } = parseCsv(csvText);
  const errors: string[] = [];
  let created = 0;
  if (rows.length === 0) {
    return { ok: false, created: 0, failed: 0, errors: ["データ行がありません"] };
  }

  const nameToId = await categoryMap();
  const status = publish ? "PUBLISHED" : "PENDING_REVIEW";

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2; // ヘッダ+1始まり
    const r = rows[i];
    const title = (r.title ?? "").trim();
    if (!title) {
      errors.push(`${line}行目: タイトル(title)が空です`);
      continue;
    }
    const startsAt = parseJstDate(r.startsAt ?? "");
    if (!startsAt) {
      errors.push(`${line}行目: 日時(startsAt)が不正です（例 2026-08-15 19:00）`);
      continue;
    }
    const endsAt = (r.endsAt ?? "").trim() ? parseJstDate(r.endsAt) : null;
    try {
      await createEventFromPayload({
        title,
        description: r.description ?? null,
        occurrences: [{ startsAt, endsAt: endsAt ?? null }],
        venueName: r.venueName ?? null,
        venueRegion: r.region ?? null,
        categoryIds: await resolveCategoryIds(r.category ?? "", nameToId),
        status,
        sourceType: "MANUAL",
        trustWeight: 80,
        confidenceScore: 80,
      });
      created++;
    } catch (e) {
      errors.push(`${line}行目: 登録に失敗（${(e as Error).message}）`);
    }
  }

  revalidatePath("/admin/eventmanage");
  revalidatePath("/admin");
  return { ok: created > 0, created, failed: rows.length - created, errors };
}

// ── アイデアのCSV一括投入 ──────────────────────────────────
// 列: title(必須), description, area, region, minPeople, maxPeople, mood, weather, durationMin, category
export async function importIdeasFromCsv(
  csvText: string,
  publish: boolean,
): Promise<ImportResult> {
  await requireAdmin();
  const { rows } = parseCsv(csvText);
  const errors: string[] = [];
  let created = 0;
  if (rows.length === 0) {
    return { ok: false, created: 0, failed: 0, errors: ["データ行がありません"] };
  }

  const nameToId = await categoryMap();
  const status = publish ? "PUBLISHED" : "PENDING_REVIEW";

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const r = rows[i];
    const title = (r.title ?? "").trim();
    if (!title) {
      errors.push(`${line}行目: タイトル(title)が空です`);
      continue;
    }
    try {
      await createIdeaFromPayload({
        title,
        description: r.description ?? null,
        area: r.area ?? null,
        region: r.region ?? null,
        minPeople: parseIntOrNull(r.minPeople ?? ""),
        maxPeople: parseIntOrNull(r.maxPeople ?? ""),
        mood: r.mood ?? null,
        weather: r.weather ?? null,
        durationMin: parseIntOrNull(r.durationMin ?? ""),
        categoryIds: await resolveCategoryIds(r.category ?? "", nameToId),
        status,
      });
      created++;
    } catch (e) {
      errors.push(`${line}行目: 登録に失敗（${(e as Error).message}）`);
    }
  }

  revalidatePath("/admin/eventmanage");
  return { ok: created > 0, created, failed: rows.length - created, errors };
}
