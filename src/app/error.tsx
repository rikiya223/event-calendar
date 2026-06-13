"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Icon name="error" className="text-[56px] text-error" />
      <h1 className="mt-4 text-2xl font-bold text-on-surface">問題が発生しました</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        一時的なエラーの可能性があります。もう一度お試しください。
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          再試行
        </button>
        <Link href="/calendar" className="rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-variant/40">
          カレンダーへ
        </Link>
      </div>
    </main>
  );
}
