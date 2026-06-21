"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

// 戻り先（?from=...）はクライアント側で読む。これにより詳細ページ本体は
// searchParams に依存せず ISR キャッシュ可能になる。
function safeBack(from: string | null): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/calendar";
}

export function BackLink() {
  const from = useSearchParams().get("from");
  const href = safeBack(from);
  return (
    <Link href={href} className="inline-flex items-center text-sm text-on-surface/70 hover:text-on-surface">
      ← {href.startsWith("/calendar") ? "カレンダーに戻る" : "戻る"}
    </Link>
  );
}
