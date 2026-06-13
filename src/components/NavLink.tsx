"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

// サイドバー用のナビリンク（現在地をハイライト）
export function NavLink({
  href,
  icon,
  label,
  exact = false,
}: {
  href: string;
  icon: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
        active
          ? "bg-primary-container font-semibold text-on-primary-container shadow-sm"
          : "text-on-surface-variant hover:bg-surface-variant/50"
      }`}
    >
      <Icon name={icon} fill={active} className="text-[20px]" />
      {label}
    </Link>
  );
}
