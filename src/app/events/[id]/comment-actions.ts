"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const MAX_LEN = 500;
const COOLDOWN_MS = 15000; // 連投制限（同一ユーザー）

function authorName(u: { displayName: string | null; email: string }): string {
  return u.displayName?.trim() || u.email.split("@")[0] || "ユーザー";
}

// 認証の取得にタイムアウトを付ける（Supabase制限中などで getUser が固まっても一覧表示は止めない）。
async function viewerWithTimeout(ms = 3000) {
  return Promise.race([
    getCurrentUser().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// コメント一覧 ＋ 閲覧者が投稿/削除できるか。クライアントから呼ぶ（詳細ページはキャッシュ維持）。
// 一覧は認証に依存しないので、認証取得が遅くても（or 失敗しても）コメントは表示する。
export async function getComments(eventId: string) {
  const userP = viewerWithTimeout();
  let rows: { id: string; body: string; createdAt: Date; userId: string; user: { displayName: string | null; email: string } }[] = [];
  try {
    rows = await prisma.comment.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, body: true, createdAt: true, userId: true, user: { select: { displayName: true, email: true } } },
    });
  } catch {
    rows = []; // テーブル未作成などでも詳細ページは壊さない
  }
  const user = await userP;
  const admin = isAdminEmail(user?.email);
  return {
    canPost: !!user,
    comments: rows.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      authorName: authorName(c.user),
      canDelete: !!user && (c.userId === user.id || admin),
    })),
  };
}

export async function postComment(eventId: string, bodyRaw: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "ログインが必要です" };
  const body = bodyRaw.trim();
  if (body.length === 0) return { ok: false as const, error: "コメントを入力してください" };
  if (body.length > MAX_LEN) return { ok: false as const, error: `${MAX_LEN}文字以内で入力してください` };

  await ensureUserRecord(user);

  // 連投制限：直近15秒以内に投稿があれば拒否
  const recent = await prisma.comment.findFirst({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) } },
    select: { id: true },
  });
  if (recent) return { ok: false as const, error: "投稿の間隔を少しあけてください" };

  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!ev) return { ok: false as const, error: "イベントが見つかりません" };

  await prisma.comment.create({ data: { eventId, userId: user.id, body } });
  return { ok: true as const };
}

export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "ログインが必要です" };
  const c = await prisma.comment.findUnique({ where: { id: commentId }, select: { userId: true } });
  if (!c) return { ok: true as const }; // 既に無い
  if (c.userId !== user.id && !isAdminEmail(user.email)) return { ok: false as const, error: "権限がありません" };
  await prisma.comment.delete({ where: { id: commentId } });
  return { ok: true as const };
}
