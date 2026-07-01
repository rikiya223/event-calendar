"use client";

import { useActionState } from "react";
import { unlockAdmin, type UnlockState } from "./actions";

// Supabaseログインが使えない時の合言葉入力。一致すると cookie が発行され、
// 以降このブラウザでは管理画面が使える（30日）。
export function UnlockForm() {
  const [state, formAction, pending] = useActionState<UnlockState, FormData>(
    unlockAdmin,
    {},
  );

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 text-center text-xl font-bold text-slate-800">
        イベント・アイデア管理
      </h1>
      <p className="mb-6 text-center text-sm text-slate-500">
        合言葉を入力してください（ログイン不要）
      </p>
      <form action={formAction} className="space-y-3">
        <input
          type="password"
          name="key"
          autoComplete="off"
          required
          placeholder="合言葉"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "確認中…" : "解錠する"}
        </button>
      </form>
    </main>
  );
}
