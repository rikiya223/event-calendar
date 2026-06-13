import Link from "next/link";
import { Icon } from "./Icon";

// スマホ用の上部バー（lg未満で表示）。主要ナビは下部タブが担当。
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <Icon name="event_note" className="text-[22px] text-primary" />
          <span className="text-base font-bold tracking-tight text-primary">EventCalendar JP</span>
        </Link>
        <Link
          href="/explore"
          aria-label="さがす"
          className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-variant/50"
        >
          <Icon name="search" />
        </Link>
      </div>
    </header>
  );
}
