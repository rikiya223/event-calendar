import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

// 管理者は環境変数 ADMIN_EMAILS（カンマ区切り）で指定する。
// 例: ADMIN_EMAILS="you@example.com,teammate@example.com"
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return isAdminEmail(user?.email);
}

// 管理者でなければリダイレクトして処理を止める。
// ページとサーバーアクションの両方の入り口で呼ぶこと。
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/");
  return user;
}
