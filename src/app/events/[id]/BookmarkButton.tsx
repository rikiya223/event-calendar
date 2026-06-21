"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBookmark, getBookmarkState } from "./actions";

export function BookmarkButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  // ページはISRキャッシュ（認証なし）なので、状態はマウント後にクライアントから取得する。
  const [bookmarked, setBookmarked] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getBookmarkState(eventId).then((b) => {
      if (alive) setBookmarked(b);
    });
    return () => {
      alive = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function onClick() {
    startTransition(async () => {
      const res = await toggleBookmark(eventId);
      if (!res.ok && res.reason === "unauthenticated") {
        const here = window.location.pathname + window.location.search;
        router.push(`/login?next=${encodeURIComponent(here)}`);
        return;
      }
      if (res.ok) {
        setBookmarked(res.bookmarked);
        setToast(res.bookmarked ? "「気になる」に追加しました" : "「気になる」を解除しました");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={bookmarked}
        className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
          bookmarked
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "border-outline-variant/50 text-on-surface-variant hover:bg-surface-container-low"
        }`}
      >
        {bookmarked ? "★ 気になる" : "☆ 気になる"}
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
