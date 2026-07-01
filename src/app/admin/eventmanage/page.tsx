import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { BulkImport } from "./BulkImport";

export const dynamic = "force-dynamic";
export const metadata = { title: "イベント・アイデア管理" };

export default async function EventManagePage() {
  await requireAdmin();

  const [eventCount, ideaCount, pendingEvents, pendingIdeas, categories] =
    await Promise.all([
      prisma.event.count(),
      prisma.idea.count(),
      prisma.event.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.idea.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { name: true },
      }),
    ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
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

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">
          イベントをCSVで一括投稿
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          日時が決まっている催し（祭り・展示・ライブなど）。日時は JST。
        </p>
        <BulkImport kind="event" />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">
          遊びアイデアをCSVで一括投稿
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          日付に縛られない遊び（例: 山手線を一周散歩する）。
        </p>
        <BulkImport kind="idea" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          カテゴリ名（CSVの category 列にこの名前を入れてください）
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span
              key={c.name}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600"
            >
              {c.name}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          複数付けるときは「祭り|グルメ」のように「|」で区切ります。未知の名前は無視されます。
        </p>
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
