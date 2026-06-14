"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 現在のカテゴリ絞り込み（非表示カテゴリのid配列）をログインユーザーの既定として保存する。
export async function saveCalendarFilter(excludedCategoryIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "ログインが必要です" };
  await ensureUserRecord({ id: user.id, email: user.email });
  // 念のため重複を除いて保存
  const ids = [...new Set(excludedCategoryIds)];
  await prisma.userCalendarPref.upsert({
    where: { userId: user.id },
    update: { excludedCategoryIds: ids },
    create: { userId: user.id, excludedCategoryIds: ids },
  });
  return { ok: true as const };
}

// 保存した既定の絞り込みを削除する。
export async function clearSavedCalendarFilter() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "ログインが必要です" };
  await prisma.userCalendarPref.deleteMany({ where: { userId: user.id } });
  return { ok: true as const };
}
