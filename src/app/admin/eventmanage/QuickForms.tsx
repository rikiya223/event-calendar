"use client";

import { useActionState, useState } from "react";
import {
  createEventManual,
  createIdeaManual,
  type FormState,
} from "./actions";

export type Cat = { id: string; name: string; parentId: string | null };

// 16px(text-base) 未満だと iOS Safari が入力時に自動ズームするため text-base を必須にする。
const input =
  "w-full rounded-lg border border-slate-300 px-3 py-3 text-base";
const label = "mb-1 block text-sm font-medium text-slate-600";

function CategoryPicker({ categories }: { categories: Cat[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div>
      <label className={label}>カテゴリ（タップで選択・複数可）</label>
      {selected.map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} />
      ))}
      <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
        {categories.map((c) => {
          const active = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Result({ state }: { state: FormState }) {
  if (state.error)
    return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.ok)
    return <p className="text-sm text-green-700">{state.message}</p>;
  return null;
}

function PublishAndSubmit({ pending }: { pending: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="publish" className="h-5 w-5" />
        すぐ公開する（オフ = 審査待ち）
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-3 text-base font-medium text-white disabled:opacity-50 sm:ml-auto sm:py-2 sm:text-sm"
      >
        {pending ? "登録中…" : "登録する"}
      </button>
    </div>
  );
}

export function EventQuickForm({ categories }: { categories: Cat[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createEventManual,
    {},
  );
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div>
        <label className={label}>タイトル *</label>
        <input name="title" required className={input} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>開始日時 *（JST）</label>
          <input type="datetime-local" name="startsAt" required className={input} />
        </div>
        <div>
          <label className={label}>終了日時（任意・会期もの）</label>
          <input type="datetime-local" name="endsAt" className={input} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>会場名</label>
          <input name="venueName" className={input} />
        </div>
        <div>
          <label className={label}>都道府県</label>
          <input name="region" placeholder="東京都" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>説明</label>
        <textarea name="description" rows={3} className={input} />
      </div>
      <CategoryPicker categories={categories} />
      <PublishAndSubmit pending={pending} />
      <Result state={state} />
    </form>
  );
}

export function IdeaQuickForm({ categories }: { categories: Cat[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createIdeaManual,
    {},
  );
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div>
        <label className={label}>タイトル *</label>
        <input name="title" required placeholder="山手線を一周散歩する" className={input} />
      </div>
      <div>
        <label className={label}>説明</label>
        <textarea name="description" rows={3} className={input} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>場所（自由記述）</label>
          <input name="area" placeholder="山手線沿線" className={input} />
        </div>
        <div>
          <label className={label}>都道府県</label>
          <input name="region" className={input} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={label}>人数(下限)</label>
          <input
            type="number"
            inputMode="numeric"
            name="minPeople"
            min={1}
            className={input}
          />
        </div>
        <div>
          <label className={label}>人数(上限)</label>
          <input
            type="number"
            inputMode="numeric"
            name="maxPeople"
            min={1}
            className={input}
          />
        </div>
        <div>
          <label className={label}>所要(分)</label>
          <input
            type="number"
            inputMode="numeric"
            name="durationMin"
            min={0}
            className={input}
          />
        </div>
        <div>
          <label className={label}>天気</label>
          <input name="weather" placeholder="晴れ" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>気分</label>
        <input name="mood" placeholder="リフレッシュ" className={input} />
      </div>
      <div>
        <label className={label}>持ち物（任意）</label>
        <input
          name="belongings"
          placeholder="本、飲み物、レジャーシート"
          className={input}
        />
      </div>
      <CategoryPicker categories={categories} />
      <PublishAndSubmit pending={pending} />
      <Result state={state} />
    </form>
  );
}
