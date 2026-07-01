import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdminUnlocked } from "@/lib/adminAccess";
import { BulkImport } from "./BulkImport";
import { UnlockForm } from "./UnlockForm";
import { EventQuickForm, IdeaQuickForm } from "./QuickForms";
import { CategoryManager } from "./CategoryManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "イベント・アイデア管理" };

export default async function EventManagePage() {
  // ログイン(ADMIN_EMAILS) か 合言葉(ADMIN_ACCESS_KEY) のどちらかで解錠。
  if (!(await isAdminUnlocked())) {
    return <UnlockForm />;
  }

  const [eventCount, ideaCount, pendingEvents, pendingIdeas, categories] =
    await Promise.all([
      prisma.event.count(),
      prisma.idea.count(),
      prisma.event.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.idea.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, parentId: true },
      }),
    ]);

  const topCategories = categories.filter((c) => c.parentId === null);

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
          イベント・アイデア管理
        </h1>
        <Link href="/admin" className="text-sm text-primary hover:underline">
          審査キューへ →
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="イベント総数" value={eventCount} />
        <Stat label="うち審査待ち" value={pendingEvents} accent />
        <Stat label="アイデア総数" value={ideaCount} />
        <Stat label="うち審査待ち" value={pendingIdeas} accent />
      </div>

      {/* イベント */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">
          イベントを投稿
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          日時が決まっている催し（祭り・展示・ライブなど）。
        </p>
        <EventQuickForm categories={categories} />
        <details className="mt-3">
          <summary className="cursor-pointer rounded-lg py-2 text-sm font-medium text-primary">
            CSVで一括投稿する
          </summary>
          <div className="mt-3">
            <BulkImport kind="event" />
          </div>
        </details>
      </section>

      {/* アイデア */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">
          遊びアイデアを投稿
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          日付に縛られない遊び（例: 山手線を一周散歩する）。
        </p>
        <IdeaQuickForm categories={categories} />
        <details className="mt-3">
          <summary className="cursor-pointer rounded-lg py-2 text-sm font-medium text-primary">
            CSVで一括投稿する
          </summary>
          <div className="mt-3">
            <BulkImport kind="idea" />
          </div>
        </details>
      </section>

      {/* カテゴリ管理 */}
      <section className="mb-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">カテゴリ</h2>
        <p className="mb-3 text-sm text-slate-500">
          新しいカテゴリを追加できます（投稿フォーム・CSVの両方に反映）。
        </p>
        <CategoryManager categories={categories} topCategories={topCategories} />
      </section>

      <p className="mt-6 text-xs text-slate-400">
        画像アップロードは準備中（Supabase Storage 設定後に各項目へ追加予定）。
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-2xl font-bold ${
          accent ? "text-primary" : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
