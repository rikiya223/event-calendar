"use server";

import { ReportReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth";

export type ReportResult = { ok: boolean; message: string };

const REPORT_REASONS: ReportReason[] = ["WRONG_DATE", "WRONG_VENUE", "ENDED", "DUPLICATE", "OTHER"];

// 情報の誤り報告（ログイン不要。詳細ページから送信）。
export async function submitEventReport(eventId: string, formData: FormData): Promise<ReportResult> {
  const reason = String(formData.get("reason") ?? "");
  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    return { ok: false, message: "報告の理由を選んでください。" };
  }
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 1000) || null;
  const email = String(formData.get("email") ?? "").trim().slice(0, 200) || null;

  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!ev) return { ok: false, message: "イベントが見つかりませんでした。" };

  await prisma.eventReport.create({
    data: { eventId, reason: reason as ReportReason, detail, reporterEmail: email },
  });
  return { ok: true, message: "報告ありがとうございます。内容を確認します。" };
}

export type ToggleResult =
  | { ok: true; bookmarked: boolean }
  | { ok: false; reason: "unauthenticated" };

export async function toggleBookmark(eventId: string): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  await ensureUserRecord(user);

  const existing = await prisma.bookmark.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { ok: true, bookmarked: false };
  }

  await prisma.bookmark.create({ data: { userId: user.id, eventId } });
  return { ok: true, bookmarked: true };
}

// 「気になる」状態の取得（クライアントから初期表示用に呼ぶ）。
// これを使うことで詳細ページ自体は認証に依存せず＝ISRキャッシュ可能になる。
export async function getBookmarkState(eventId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const existing = await prisma.bookmark.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
    select: { id: true },
  });
  return existing !== null;
}
