import { prisma } from "@/lib/prisma";

// Supabase の認証ユーザーを、アプリ側の User テーブルに同期する。
// User.id = Supabase の user id（uuid）として対応づける。
// ブックマークや投稿の外部キー（User.id）はこのレコードを指す。
export async function ensureUserRecord(user: { id: string; email?: string | null }) {
  const email = user.email ?? `${user.id}@noemail.local`;
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email },
    create: { id: user.id, email },
  });
}
