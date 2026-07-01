"use client";

import { useActionState } from "react";
import { createCategory, type FormState } from "./actions";
import type { Cat } from "./QuickForms";

export function CategoryManager({
  categories,
  topCategories,
}: {
  categories: Cat[];
  topCategories: Cat[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createCategory,
    {},
  );

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-3 text-base";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-600">
            新しいカテゴリ名 *
          </label>
          <input name="name" required placeholder="例: 街歩き" className={input} />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-600">
            親カテゴリ（任意）
          </label>
          <select name="parentId" className={input} defaultValue="">
            <option value="">なし（大分類として追加）</option>
            {topCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-3 text-base font-medium text-white disabled:opacity-50 sm:py-3 sm:text-sm"
        >
          {pending ? "追加中…" : "カテゴリを追加"}
        </button>
      </form>

      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-2 text-sm text-green-700">{state.message}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <span
            key={c.id}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
          >
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}
