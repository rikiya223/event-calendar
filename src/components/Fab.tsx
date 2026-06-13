"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

// スマホ用の投稿FAB（下部ナビの上に浮かせる）。
// 自分の画面（投稿・ログイン）やイベント詳細（独自の下部バーあり）では非表示。
const HIDE_ON = ["/submit", "/login"];

export function Fab() {
  const pathname = usePathname();
  if (HIDE_ON.includes(pathname) || pathname.startsWith("/events/")) return null;

  return (
    <Link
      href="/submit"
      aria-label="イベントを投稿"
      className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition active:scale-95 lg:hidden"
    >
      <Icon name="add" className="text-[28px]" />
    </Link>
  );
}
