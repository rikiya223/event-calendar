"use client";

import { useActionState } from "react";
import { PREFECTURES } from "@/lib/regions";
import { inputClass, labelClass } from "@/lib/formStyles";
import { submitEvent, type SubmitState } from "./actions";

type CategoryNode = {
  id: string;
  name: string;
  icon: string | null;
  children: { id: string; name: string }[];
};

const initialState: SubmitState = { ok: false, message: "" };

export function SubmitForm({ categories }: { categories: CategoryNode[] }) {
  const [state, formAction, pending] = useActionState(submitEvent, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className={labelClass} htmlFor="title">
          イベント名 <span className="text-rose-500">*</span>
        </label>
        <input id="title" name="title" required className={inputClass} placeholder="例：地元バンドの夏ライブ" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="startsAt">
            開始日時（日本時間）<span className="text-rose-500">*</span>
          </label>
          <input id="startsAt" name="startsAt" type="datetime-local" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="endsAt">
            終了日時（任意）
          </label>
          <input id="endsAt" name="endsAt" type="datetime-local" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="venueName">
            会場名（任意）
          </label>
          <input id="venueName" name="venueName" className={inputClass} placeholder="例：渋谷○○ホール" />
        </div>
        <div>
          <label className={labelClass} htmlFor="venueAddress">
            会場住所（任意）
          </label>
          <input id="venueAddress" name="venueAddress" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="region">
          開催地（都道府県・任意）
        </label>
        <select id="region" name="region" defaultValue="" className={inputClass}>
          <option value="">未指定</option>
          {PREFECTURES.map((pref) => (
            <option key={pref} value={pref}>{pref}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          説明（任意）
        </label>
        <textarea id="description" name="description" rows={3} className={inputClass} placeholder="イベントの概要など" />
      </div>

      <fieldset>
        <legend className={labelClass}>カテゴリ（任意・複数選択可）</legend>
        <div className="space-y-3 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
          {categories.map((parent) => (
            <div key={parent.id}>
              <p className="mb-1.5 text-xs font-semibold text-on-surface-variant">
                {parent.icon} {parent.name}
              </p>
              <div className="flex flex-wrap gap-2">
                <CategoryChip id={parent.id} label={parent.name} />
                {parent.children.map((c) => (
                  <CategoryChip key={c.id} id={c.id} label={c.name} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "送信中…" : "投稿する"}
        </button>
        {state.message && (
          <p className={`text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function CategoryChip({ id, label }: { id: string; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-outline-variant/50 bg-white px-3 py-1 text-sm text-on-surface-variant transition has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:checked]:text-primary">
      <input type="checkbox" name="categoryIds" value={id} className="sr-only" />
      {label}
    </label>
  );
}
