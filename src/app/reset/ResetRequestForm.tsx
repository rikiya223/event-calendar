"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/lib/formStyles";

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setPending(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=/reset/update`,
    });
    setPending(false);
    setMsg(
      error
        ? { type: "error", text: "送信に失敗しました。メールアドレスをご確認ください。" }
        : { type: "ok", text: "再設定用のメールを送信しました。メール内のリンクから手続きしてください。" },
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="email">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "送信中…" : "再設定メールを送る"}
      </button>
    </form>
  );
}
