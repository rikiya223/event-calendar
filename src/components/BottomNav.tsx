"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useViewer } from "./useViewer";

// スマホ専用の下部タブナビ（lg以上では非表示）。仕様 4.2 のタブナビ。
// ログイン状態はクライアントで取得（ページのキャッシュを妨げないため）。
export function BottomNav() {
  const pathname = usePathname();
  const loggedIn = !!useViewer()?.email;

  const items = [
    { href: "/calendar", label: "ホーム", icon: "home" },
    { href: "/explore", label: "さがす", icon: "search" },
    loggedIn
      ? { href: "/mypage", label: "マイページ", icon: "person" }
      : { href: "/login", label: "ログイン", icon: "person" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/20 bg-surface/90 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:hidden">
      <ul className="flex items-stretch">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition ${
                  active ? "font-bold text-primary" : "text-on-surface-variant"
                }`}
              >
                <Icon name={it.icon} fill={active} className="text-[22px]" />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
