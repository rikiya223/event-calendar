"use client";

import Link from "next/link";
import { signOutAction } from "@/app/login/actions";
import { NavLink } from "./NavLink";
import { useViewer } from "./useViewer";

// 管理リンク（管理者のみ表示）。ログイン状態はクライアントで取得する。
export function AdminNavLink() {
  const viewer = useViewer();
  if (!viewer?.admin) return null;
  return <NavLink href="/admin" icon="build" label="管理" />;
}

// サイドバー下部のアカウント欄（ログイン中＝メール＋ログアウト / 未ログイン＝ログイン）。
export function SidebarAuth() {
  const viewer = useViewer();
  const email = viewer?.email ?? null;

  if (email) {
    return (
      <div className="flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary-container text-sm font-semibold text-secondary">
          {email[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-on-surface">{email}</p>
          <form action={signOutAction}>
            <button className="text-[11px] text-outline transition hover:text-error">ログアウト</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
    >
      ログイン
    </Link>
  );
}
