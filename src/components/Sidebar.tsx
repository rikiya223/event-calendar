import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { colorForKey } from "@/lib/categoryColors";
import { signOutAction } from "@/app/login/actions";
import { NavLink } from "./NavLink";
import { Icon } from "./Icon";

// PC用の左サイドバー（lg以上で表示）。
export async function Sidebar({ email, admin }: { email?: string | null; admin: boolean }) {
  // 公開イベントがある大分類だけ表示（空カテゴリは出さない）
  const categories = await prisma.category.findMany({
    where: {
      parentId: null,
      OR: [
        { eventCategories: { some: { event: { status: "PUBLISHED" } } } },
        { children: { some: { eventCategories: { some: { event: { status: "PUBLISHED" } } } } } },
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, colorKey: true },
  });

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant/30 bg-surface-container-low px-4 py-6 lg:flex">
      <Link href="/calendar" className="mb-7 flex items-center gap-2.5 px-2">
        <Icon name="event_note" className="text-[26px] text-primary" />
        <span className="text-lg font-bold tracking-tight text-primary">EventCalendar JP</span>
      </Link>

      <nav className="flex flex-col gap-1">
        <NavLink href="/calendar" icon="home" label="ホーム" />
        <NavLink href="/explore" icon="search" label="さがす" />
        <NavLink href="/submit" icon="add_circle" label="投稿する" />
        <NavLink href="/mypage" icon="person" label="マイページ" />
        {admin && <NavLink href="/admin" icon="build" label="管理" />}
      </nav>

      <div className="mt-6">
        <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-outline">
          カテゴリ
        </p>
        <ul className="space-y-0.5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/calendar?cat=${c.id}`}
                className="flex items-center gap-3 rounded-xl px-4 py-2 text-sm text-on-surface-variant transition hover:bg-surface-variant/50"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorForKey(c.colorKey) }} />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-outline-variant/30 pt-3">
        {email ? (
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
        ) : (
          <Link
            href="/login"
            className="block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
          >
            ログイン
          </Link>
        )}
      </div>
    </aside>
  );
}
