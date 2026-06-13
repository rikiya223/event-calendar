"use server";

import { revalidatePath } from "next/cache";
import { EventStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import {
  createEventFromPayload,
  findOrCreateVenue,
  findOrCreatePerformers,
  type OccurrenceInput,
} from "@/lib/events";
import { asSubmissionPayload } from "@/lib/submission";
import { parseJstLocal } from "@/lib/calendar";

export type CreateEventState = {
  ok: boolean;
  message: string;
};

// 手動登録は信頼度が高い（管理者が直接入力）ため、ソースの重みと
// イベントの信頼度スコアを高めに設定する（仕様 5.4）。
const MANUAL_TRUST_WEIGHT = 80;
const MANUAL_CONFIDENCE = 80;

// ユーザー投稿は信頼度が低い（仕様 5.4）。承認時はそれを反映する。
const USER_TRUST_WEIGHT = 30;
const USER_CONFIDENCE = 40;

type ParsedEvent = {
  title: string;
  description: string;
  occurrences: OccurrenceInput[];
  venueName: string;
  venueAddress: string;
  venueRegion: string;
  categoryIds: string[];
  performerNames: string[];
  status: EventStatus;
};

// 登録・編集フォーム共通の解析＋バリデーション
function parseEventForm(
  formData: FormData,
): { ok: true; data: ParsedEvent } | { ok: false; message: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, message: "イベント名を入力してください。" };

  // 開催回（複数可）。occStartsAt / occEndsAt は並びで対応する。
  const occStarts = formData.getAll("occStartsAt").map(String);
  const occEnds = formData.getAll("occEndsAt").map(String);
  const occurrences: OccurrenceInput[] = [];
  for (let i = 0; i < occStarts.length; i++) {
    const s = occStarts[i].trim();
    if (!s) continue;
    const startsAt = parseJstLocal(s);
    if (Number.isNaN(startsAt.getTime()))
      return { ok: false, message: "開始日時の形式が正しくありません。" };
    let endsAt: Date | null = null;
    const e = (occEnds[i] ?? "").trim();
    if (e) {
      endsAt = parseJstLocal(e);
      if (Number.isNaN(endsAt.getTime()))
        return { ok: false, message: "終了日時の形式が正しくありません。" };
      if (endsAt < startsAt)
        return { ok: false, message: "終了日時は開始日時より後にしてください。" };
    }
    occurrences.push({ startsAt, endsAt });
  }
  if (occurrences.length === 0)
    return { ok: false, message: "開催日時を1つ以上入力してください。" };

  const performerNames = String(formData.get("performers") ?? "")
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const statusRaw = String(formData.get("status") ?? "PUBLISHED");
  const status =
    statusRaw === "PENDING_REVIEW" ? EventStatus.PENDING_REVIEW : EventStatus.PUBLISHED;

  return {
    ok: true,
    data: {
      title,
      description: String(formData.get("description") ?? "").trim(),
      occurrences,
      venueName: String(formData.get("venueName") ?? ""),
      venueAddress: String(formData.get("venueAddress") ?? ""),
      venueRegion: String(formData.get("region") ?? ""),
      categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
      performerNames,
      status,
    },
  };
}

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  await requireAdmin();

  const parsed = parseEventForm(formData);
  if (!parsed.ok) return parsed;
  const d = parsed.data;

  try {
    await createEventFromPayload({
      title: d.title,
      description: d.description,
      occurrences: d.occurrences,
      venueName: d.venueName,
      venueAddress: d.venueAddress,
      venueRegion: d.venueRegion,
      categoryIds: d.categoryIds,
      performerNames: d.performerNames,
      status: d.status,
      sourceType: "MANUAL",
      trustWeight: MANUAL_TRUST_WEIGHT,
      confidenceScore: MANUAL_CONFIDENCE,
    });

    revalidatePath("/admin");
    revalidatePath("/calendar");
    return { ok: true, message: `「${d.title}」を登録しました。` };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "登録に失敗しました。時間をおいて再度お試しください。" };
  }
}

// ── 既存イベントの編集 ─────────────────────────────────

export async function updateEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "対象イベントが不明です。" };

  const parsed = parseEventForm(formData);
  if (!parsed.ok) return parsed;
  const d = parsed.data;

  try {
    const venue = await findOrCreateVenue(d.venueName, d.venueAddress, d.venueRegion);
    const performerIds = await findOrCreatePerformers(d.performerNames);

    await prisma.event.update({
      where: { id },
      data: {
        canonicalTitle: d.title,
        description: d.description || null,
        status: d.status,
        venueId: venue?.id ?? null,
      },
    });

    // 開催回・カテゴリ・出演者はいずれも「全削除→再作成」で入れ替える
    await prisma.eventOccurrence.deleteMany({ where: { eventId: id } });
    await prisma.eventOccurrence.createMany({
      data: d.occurrences.map((o) => ({ eventId: id, startsAt: o.startsAt, endsAt: o.endsAt })),
    });

    await prisma.eventCategory.deleteMany({ where: { eventId: id } });
    if (d.categoryIds.length) {
      await prisma.eventCategory.createMany({
        data: d.categoryIds.map((categoryId) => ({ eventId: id, categoryId })),
      });
    }

    await prisma.eventPerformer.deleteMany({ where: { eventId: id } });
    if (performerIds.length) {
      await prisma.eventPerformer.createMany({
        data: performerIds.map((performerId) => ({ eventId: id, performerId })),
      });
    }

    revalidatePath("/admin");
    revalidatePath("/calendar");
    revalidatePath(`/events/${id}`);
    return { ok: true, message: "更新しました。" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "更新に失敗しました。時間をおいて再度お試しください。" };
  }
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // 関連（開催回・ソース・カテゴリ・ブックマーク）は onDelete: Cascade で削除される
  await prisma.event.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin");
  revalidatePath("/calendar");
}

// ── ユーザー投稿の承認／却下 ───────────────────────────

export async function approveSubmission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const submission = await prisma.eventSubmission.findUnique({ where: { id } });
  if (!submission || submission.status !== "PENDING") return;

  const p = asSubmissionPayload(submission.payload);
  const startsAt = new Date(p.startsAt);
  if (Number.isNaN(startsAt.getTime())) return;

  // 取得元（origin）に応じてソース種別・信頼度を引き継ぐ（仕様 5.4）
  const sourceInfo =
    p.origin === "rss"
      ? { sourceType: "OFFICIAL_API" as const, trustWeight: 60, confidenceScore: 60 }
      : p.origin === "ai"
        ? { sourceType: "AI_AGENT" as const, trustWeight: USER_TRUST_WEIGHT, confidenceScore: USER_CONFIDENCE }
        : { sourceType: "USER" as const, trustWeight: USER_TRUST_WEIGHT, confidenceScore: USER_CONFIDENCE };

  await createEventFromPayload({
    title: p.title,
    description: p.description,
    occurrences: [{ startsAt, endsAt: p.endsAt ? new Date(p.endsAt) : null }],
    venueName: p.venueName,
    venueAddress: p.venueAddress,
    venueRegion: p.venueRegion,
    categoryIds: p.categoryIds,
    status: EventStatus.PUBLISHED,
    sourceUrl: p.sourceUrl,
    ...sourceInfo,
  });

  await prisma.eventSubmission.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/admin");
  revalidatePath("/calendar");
}

export async function rejectSubmission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.eventSubmission.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  revalidatePath("/admin");
}
