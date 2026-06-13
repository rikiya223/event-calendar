"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureUserRecord } from "@/lib/auth";
import { safeNext } from "@/lib/url";

export type AuthState = { error?: string; notice?: string };

export async function authAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const mode = String(formData.get("mode") ?? "signin");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }
  if (mode === "signup" && password.length < 6) {
    return { error: "パスワードは6文字以上にしてください。" };
  }

  const supabase = await createClient();

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) await ensureUserRecord(data.user);
    // メール確認がONの場合は session が無い
    if (!data.session) {
      return { notice: "確認メールを送信しました。メール内のリンクから認証してください。" };
    }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "メールアドレスまたはパスワードが正しくありません。" };
    if (data.user) await ensureUserRecord(data.user);
  }

  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
