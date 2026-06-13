"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import { inputClass } from "@/lib/formStyles";
import { authAction, type AuthState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPw, setShowPw] = useState(false);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    authAction,
    {},
  );

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 font-medium transition ${
              mode === m ? "bg-primary text-white" : "text-slate-600"
            }`}
          >
            {m === "signin" ? "ログイン" : "新規登録"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
            メールアドレス
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-on-surface" htmlFor="password">
              パスワード
            </label>
            {mode === "signin" && (
              <Link href="/reset" className="text-xs text-primary hover:underline">
                パスワードをお忘れですか？
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "パスワードを隠す" : "パスワードを表示"}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <Icon name={showPw ? "visibility_off" : "visibility"} className="text-[18px]" />
            </button>
          </div>
        </div>

        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.notice && <p className="text-sm text-emerald-600">{state.notice}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "処理中…" : mode === "signin" ? "ログイン" : "登録してはじめる"}
        </button>
      </form>
    </div>
  );
}
