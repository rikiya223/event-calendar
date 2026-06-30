import { unstable_cache } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { colorForKey } from "@/lib/categoryColors";
import { NavLink } from "./NavLink";
import { SidebarAuth, AdminNavLink } from "./SidebarAuth";
import { Icon } from "./Icon";

// 大分類はめったに変わらないので1時間キャッシュ（毎リクエストでDBを引かない＝Supabase egress削減）。
const getTopCategories = unstable_cache(
  () =>
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, colorKey: true },
    }),
  ["sidebar-top-categories"],
  { revalidate: 3600 },
);

// PC用の左サイドバー（lg以上で表示）。ログイン依存の表示はクライアント側（SidebarAuth等）に分離し、
// このサーバーコンポーネント自体は認証に依存しない＝ページのキャッシュを妨げない。
export async function Sidebar() {
  const categories = await getTopCategories();

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
        <AdminNavLink />
      </nav>

      <div className="mt-6">
        <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-outline">
          カテゴリ
        </p>
        <ul className="space-y-0.5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/explore?cat=${c.id}`}
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
        <SidebarAuth />
      </div>
    </aside>
  );
}
