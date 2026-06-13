import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { asSubmissionPayload } from "@/lib/submission";
import { signOutAction } from "../login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "マイページ" };

function formatJst(d: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

const SUBMISSION_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "審査待ち", cls: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "公開済み", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "却下", cls: "bg-slate-200 text-slate-600" },
};

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mypage");

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        include: {
          venue: true,
          occurrences: { orderBy: { startsAt: "asc" }, take: 1 },
        },
      },
    },
  });

  const submissions = await prisma.eventSubmission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">マイページ</h1>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
            ログアウト
          </button>
        </form>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          ブックマーク <span className="text-sm font-normal text-slate-400">（{bookmarks.length}件）</span>
        </h2>
        {bookmarks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            まだブックマークがありません。
            <Link href="/calendar" className="ml-1 text-primary hover:underline">
              カレンダーから探す
            </Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {bookmarks.map((b) => {
              const occ = b.event.occurrences[0];
              return (
                <li key={b.id}>
                  <Link
                    href={`/events/${b.event.id}?from=/mypage`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <h3 className="font-semibold text-slate-800">{b.event.canonicalTitle}</h3>
                    <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                      {occ && <p>{formatJst(occ.startsAt)}</p>}
                      {b.event.venue && <p className="text-slate-500">📍 {b.event.venue.name}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          投稿履歴 <span className="text-sm font-normal text-slate-400">（{submissions.length}件）</span>
        </h2>
        {submissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            まだ投稿がありません。
            <Link href="/submit" className="ml-1 text-primary hover:underline">
              イベントを投稿する
            </Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {submissions.map((s) => {
              const p = asSubmissionPayload(s.payload);
              const st = SUBMISSION_STATUS[s.status] ?? { label: s.status, cls: "bg-slate-100 text-slate-600" };
              return (
                <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">{p.title || "（タイトルなし）"}</h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                    {p.startsAt && <p>{formatJst(new Date(p.startsAt))}</p>}
                    <p className="text-xs text-slate-400">投稿日: {formatJst(s.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
