"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export function ShareButton({ title }: { title: string }) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function onClick() {
    // 絞り込み復元用の ?from= は共有URLから除く
    const url = window.location.origin + window.location.pathname;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* ユーザーがキャンセル */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("リンクをコピーしました");
    } catch {
      setToast("コピーできませんでした");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="このイベントを共有"
        className="grid h-9 w-9 place-items-center rounded-full bg-white/40 text-on-surface backdrop-blur-sm transition hover:bg-white/70"
      >
        <Icon name="share" className="text-[20px]" />
      </button>
      {toast && (
        <div
          role="status"
          className="fixed bottom-32 left-1/2 z-50 -translate-x-1/2 rounded-full bg-on-surface px-4 py-2 text-sm font-medium text-surface shadow-lg md:bottom-20"
        >
          {toast}
        </div>
      )}
    </>
  );
}
