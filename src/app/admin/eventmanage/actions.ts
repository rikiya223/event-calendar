"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { createEventFromPayload } from "@/lib/events";
import { createIdeaFromPayload } from "@/lib/ideas";
import {
  getAdminAccessKey,
  isAdminUnlocked,
  setAccessCookie,
} from "@/lib/adminAccess";

export type ImportResult = {
  ok: boolean;
  created: number;
  failed: number;
  errors: string[]; // 「3行目: タイトルが空です」等
};

export type UnlockState = { error?: string };

// 合言葉で解錠する（Supabaseログイン不要）。一致すれば cookie を発行。
export async function unlockAdmin(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const key = String(formData.get("key") ?? "").trim();
  const expected = getAdminAccessKey();
  if (!expected) return { error: "サーバーに ADMIN_ACCESS_KEY が未設定です" };
  if (key !== expected) return { error: "合言葉が違います" };
  await setAccessCookie(key);
  revalidatePath("/admin/eventmanage");
  return {};
}

const DENIED: ImportResult = {
  ok: false,
  created: 0,
  failed: 0,
  errors: ["アクセス権がありません（合言葉で解錠してください）"],
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
  if (!(await isAdminUnlocked())) return DENIED;
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
  if (!(await isAdminUnlocked())) return DENIED;
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

// ── 1件ずつ投稿するフォーム用 ─────────────────────────────
export type FormState = { ok?: boolean; message?: string; error?: string };

function categoryIdsFrom(formData: FormData): string[] {
  return formData.getAll("categoryIds").map(String).filter(Boolean);
}

// イベントを1件登録する。
export async function createEventManual(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isAdminUnlocked())) return { error: "アクセス権がありません" };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "タイトルを入力してください" };

  const startsAt = parseJstDate(String(formData.get("startsAt") ?? ""));
  if (!startsAt) return { error: "日時が不正です" };

  const endsRaw = String(formData.get("endsAt") ?? "").trim();
  const endsAt = endsRaw ? parseJstDate(endsRaw) : null;
  const publish = formData.get("publish") === "on";

  try {
    await createEventFromPayload({
      title,
      description: String(formData.get("description") ?? "") || null,
      occurrences: [{ startsAt, endsAt: endsAt ?? null }],
      venueName: String(formData.get("venueName") ?? "") || null,
      venueRegion: String(formData.get("region") ?? "") || null,
      categoryIds: categoryIdsFrom(formData),
      status: publish ? "PUBLISHED" : "PENDING_REVIEW",
      sourceType: "MANUAL",
      trustWeight: 80,
      confidenceScore: 80,
    });
  } catch (e) {
    return { error: `登録に失敗しました（${(e as Error).message}）` };
  }

  revalidatePath("/admin/eventmanage");
  return { ok: true, message: `「${title}」を${publish ? "公開" : "審査待ちで登録"}しました` };
}

// 遊びアイデアを1件登録する。
export async function createIdeaManual(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isAdminUnlocked())) return { error: "アクセス権がありません" };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "タイトルを入力してください" };
  const publish = formData.get("publish") === "on";

  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };

  try {
    await createIdeaFromPayload({
      title,
      description: String(formData.get("description") ?? "") || null,
      area: String(formData.get("area") ?? "") || null,
      region: String(formData.get("region") ?? "") || null,
      minPeople: num("minPeople"),
      maxPeople: num("maxPeople"),
      mood: String(formData.get("mood") ?? "") || null,
      weather: String(formData.get("weather") ?? "") || null,
      durationMin: num("durationMin"),
      categoryIds: categoryIdsFrom(formData),
      status: publish ? "PUBLISHED" : "PENDING_REVIEW",
    });
  } catch (e) {
    return { error: `登録に失敗しました（${(e as Error).message}）` };
  }

  revalidatePath("/admin/eventmanage");
  return { ok: true, message: `「${title}」を${publish ? "公開" : "審査待ちで登録"}しました` };
}

// カテゴリを追加する（任意で親カテゴリ・色キーを指定）。
export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isAdminUnlocked())) return { error: "アクセス権がありません" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "カテゴリ名を入力してください" };

  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const colorKey = String(formData.get("colorKey") ?? "").trim() || null;

  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { error: `「${name}」は既に存在します` };

  try {
    await prisma.category.create({
      data: {
        name,
        parentId,
        // 色キーは大分類（親なし）のみ持たせる
        colorKey: parentId ? null : colorKey,
      },
    });
  } catch (e) {
    return { error: `追加に失敗しました（${(e as Error).message}）` };
  }

  revalidatePath("/admin/eventmanage");
  return { ok: true, message: `カテゴリ「${name}」を追加しました` };
}
