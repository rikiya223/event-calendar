import { cookies } from "next/headers";
import { isCurrentUserAdmin } from "@/lib/admin";

// Supabaseログインが使えない時のための「合言葉」アクセス。
// 環境変数 ADMIN_ACCESS_KEY と一致する cookie を持っていれば管理操作を許可する。
// ※ あくまで簡易ゲート。ログイン(ADMIN_EMAILS)が使えるならそちらが本筋。

const COOKIE = "adm_access";

export function getAdminAccessKey(): string {
  return (process.env.ADMIN_ACCESS_KEY ?? "").trim();
}

export async function hasValidAccessCookie(): Promise<boolean> {
  const key = getAdminAccessKey();
  if (!key) return false; // 鍵が未設定なら合言葉アクセスは無効
  const store = await cookies();
  return store.get(COOKIE)?.value === key;
}

// 管理操作を許可してよいか：Supabase管理者 or 有効な合言葉cookie。
export async function isAdminUnlocked(): Promise<boolean> {
  if (await isCurrentUserAdmin()) return true;
  return hasValidAccessCookie();
}

// 合言葉cookieをセット/クリアする（サーバーアクションから呼ぶ）。
export async function setAccessCookie(value: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });
}

export async function clearAccessCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
