"use client";

import { useActionState, useState } from "react";
import { submitEventReport, type ReportResult } from "./actions";

const REASONS: { value: string; label: string }[] = [
  { value: "WRONG_DATE", label: "日時が違う" },
  { value: "WRONG_VENUE", label: "会場・場所が違う" },
  { value: "ENDED", label: "終了・中止した" },
  { value: "DUPLICATE", label: "重複している" },
  { value: "OTHER", label: "その他" },
];

export function ReportButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ReportResult | null, FormData>(
    (_prev, fd) => submitEventReport(eventId, fd),
    null,
  );

  if (state?.ok) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
        {state.message}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-on-surface-variant underline-offset-2 transition hover:text-error hover:underline"
      >
        ⚠ 情報の誤りを報告
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
      <p className="text-xs font-semibold text-on-surface">情報の誤りを報告</p>
      <select
        name="reason"
        required
        defaultValue=""
        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="" disabled>
          理由を選択
        </option>
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        name="detail"
        rows={2}
        maxLength={1000}
        placeholder="補足（任意）：正しい情報など"
        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <input
        type="email"
        name="email"
        maxLength={200}
        placeholder="連絡先メール（任意）"
        className="w-full rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {state && !state.ok && <p className="text-xs text-error">{state.message}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "送信中…" : "送信"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm text-on-surface-variant transition hover:bg-surface-variant/50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
