"use client";

import { useActionState, useState } from "react";
import { PREFECTURES } from "@/lib/regions";
import { inputClass, labelClass } from "@/lib/formStyles";
import { Icon } from "@/components/Icon";
import type { CreateEventState } from "./actions";

type CategoryNode = {
  id: string;
  name: string;
  icon: string | null;
  children: { id: string; name: string }[];
};

export type EventFormDefaults = {
  title?: string;
  description?: string;
  occurrences?: { startsAt: string; endsAt: string }[]; // "YYYY-MM-DDTHH:mm"（JST）
  venueName?: string;
  venueAddress?: string;
  region?: string;
  status?: string;
  categoryIds?: string[];
  performers?: string;
};

const initialState: CreateEventState = { ok: false, message: "" };

export function EventForm({
  categories,
  action,
  defaults = {},
  eventId,
  submitLabel = "イベントを登録",
}: {
  categories: CategoryNode[];
  action: (prev: CreateEventState, formData: FormData) => Promise<CreateEventState>;
  defaults?: EventFormDefaults;
  eventId?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const checked = new Set(defaults.categoryIds ?? []);
  const [occs, setOccs] = useState<{ startsAt: string; endsAt: string }[]>(
    defaults.occurrences && defaults.occurrences.length > 0
      ? defaults.occurrences
      : [{ startsAt: "", endsAt: "" }],
  );

  function updateOcc(i: number, field: "startsAt" | "endsAt", val: string) {
    setOccs((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: val } : o)));
  }
  function addOcc() {
    setOccs((prev) => [...prev, { startsAt: "", endsAt: "" }]);
  }
  function removeOcc(i: number) {
    setOccs((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  return (
    <form action={formAction} className="space-y-5">
      {eventId && <input type="hidden" name="id" value={eventId} />}
      <div>
        <label className={labelClass} htmlFor="title">
          イベント名 <span className="text-rose-500">*</span>
        </label>
        <input id="title" name="title" required defaultValue={defaults.title} className={inputClass} placeholder="例：大相撲 夏場所" />
      </div>

      {/* 開催日時（複数可） */}
      <fieldset className="space-y-2">
        <legend className={labelClass}>
          開催日時（日本時間）<span className="text-rose-500">*</span>
          <span className="ml-1 text-xs font-normal text-on-surface-variant">複数の日程を追加できます</span>
        </legend>
        {occs.map((o, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-on-surface-variant">開始</label>
              <input
                type="datetime-local"
                name="occStartsAt"
                required={i === 0}
                value={o.startsAt}
                onChange={(e) => updateOcc(i, "startsAt", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-on-surface-variant">終了（任意）</label>
              <input
                type="datetime-local"
                name="occEndsAt"
                value={o.endsAt}
                onChange={(e) => updateOcc(i, "endsAt", e.target.value)}
                className={inputClass}
              />
            </div>
            {occs.length > 1 && (
              <button
                type="button"
                onClick={() => removeOcc(i)}
                aria-label="この開催回を削除"
                className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-lg text-rose-500 hover:bg-rose-50 sm:self-end"
              >
                <Icon name="delete" className="text-[20px]" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addOcc} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <Icon name="add" className="text-[18px]" /> 開催回を追加
        </button>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="venueName">
            会場名（任意）
          </label>
          <input id="venueName" name="venueName" defaultValue={defaults.venueName} className={inputClass} placeholder="例：両国国技館" />
        </div>
        <div>
          <label className={labelClass} htmlFor="venueAddress">
            会場住所（任意）
          </label>
          <input id="venueAddress" name="venueAddress" defaultValue={defaults.venueAddress} className={inputClass} placeholder="例：東京都墨田区横網1-3-28" />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="region">
          開催地（都道府県・任意）
        </label>
        <select id="region" name="region" defaultValue={defaults.region ?? ""} className={inputClass}>
          <option value="">未指定</option>
          {PREFECTURES.map((pref) => (
            <option key={pref} value={pref}>{pref}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="performers">
          出演者・チーム（任意・カンマ区切り）
        </label>
        <input id="performers" name="performers" defaultValue={defaults.performers} className={inputClass} placeholder="例：山田太郎, 〇〇バンド" />
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          説明（任意）
        </label>
        <textarea id="description" name="description" rows={3} defaultValue={defaults.description} className={inputClass} placeholder="イベントの概要・チケット情報など" />
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
                <CategoryChip id={parent.id} label={parent.name} checked={checked.has(parent.id)} />
                {parent.children.map((c) => (
                  <CategoryChip key={c.id} id={c.id} label={c.name} checked={checked.has(c.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="status">
          公開状態
        </label>
        <select id="status" name="status" defaultValue={defaults.status ?? "PUBLISHED"} className={inputClass}>
          <option value="PUBLISHED">公開</option>
          <option value="PENDING_REVIEW">審査待ち</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "保存中…" : submitLabel}
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

function CategoryChip({ id, label, checked }: { id: string; label: string; checked: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-outline-variant/50 bg-white px-3 py-1 text-sm text-on-surface-variant transition has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:checked]:text-primary">
      <input type="checkbox" name="categoryIds" value={id} defaultChecked={checked} className="sr-only" />
      {label}
    </label>
  );
}
