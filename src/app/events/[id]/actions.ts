"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth";

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
    revalidatePath(`/events/${eventId}`);
    return { ok: true, bookmarked: false };
  }

  await prisma.bookmark.create({ data: { userId: user.id, eventId } });
  revalidatePath(`/events/${eventId}`);
  return { ok: true, bookmarked: true };
}
