"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth";
import type { SubmissionPayload } from "@/lib/submission";
import { parseJstLocal } from "@/lib/calendar";

export type SubmitState = { ok: boolean; message: string };

export async function submitEvent(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await ensureUserRecord(user);

  const title = String(formData.get("title") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();

  if (!title) return { ok: false, message: "イベント名を入力してください。" };
  if (!startsAtRaw) return { ok: false, message: "開始日時を入力してください。" };
  const startsAt = parseJstLocal(startsAtRaw); // JST固定で解釈（サーバーTZ非依存）
  if (Number.isNaN(startsAt.getTime()))
    return { ok: false, message: "開始日時の形式が正しくありません。" };
  const endsAt = endsAtRaw ? parseJstLocal(endsAtRaw) : null;

  const payload: SubmissionPayload = {
    title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt ? endsAt.toISOString() : null,
    venueName: String(formData.get("venueName") ?? "").trim() || null,
    venueAddress: String(formData.get("venueAddress") ?? "").trim() || null,
    venueRegion: String(formData.get("region") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
  };

  await prisma.eventSubmission.create({
    data: { userId: user.id, status: "PENDING", payload },
  });

  return {
    ok: true,
    message: "投稿を受け付けました。管理者の承認後に公開されます。ありがとうございます！",
  };
}
