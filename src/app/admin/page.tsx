import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { asSubmissionPayload } from "@/lib/submission";
import { sourceBadgeLabel, originBadgeLabel } from "@/lib/sourceBadge";
import { findPotentialDuplicates, type DuplicateWarning } from "@/lib/duplicateCheck";
import { EventForm } from "./EventForm";
import { DeleteEventButton } from "./DeleteEventButton";
import { createEvent, approveSubmission, rejectSubmission, resolveReport } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "管理" };

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "公開",
  PENDING_REVIEW: "審査待ち",
  REJECTED: "却下",
};

const REPORT_REASON_LABEL: Record<string, string> = {
  WRONG_DATE: "日時が違う",
  WRONG_VENUE: "会場が違う",
  ENDED: "終了・中止",
  DUPLICATE: "重複",
  OTHER: "その他",
};

function formatJst(d: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

export default async function AdminPage() {
  // 管理者以外は弾く（未ログイン→/login、非管理者→/）
  await requireAdmin();

  // 大分類（colorKey を持つ）とその子カテゴリを取得
  const topCategories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      icon: true,
      children: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  // 審査待ちのユーザー投稿（古い順）＋ 重複チェック結果
  const pendingSubmissions = await prisma.eventSubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { email: true } } },
  });
  const categoryNameById = new Map(
    (await prisma.category.findMany({ select: { id: true, name: true } })).map((c) => [c.id, c.name]),
  );
  const reviewItems = await Promise.all(
    pendingSubmissions.map(async (s) => {
      const payload = asSubmissionPayload(s.payload);
      const warnings = await findPotentialDuplicates({
        title: payload.title,
        startsAt: payload.startsAt,
        venueName: payload.venueName,
      });
      const submitter =
        s.user?.email ?? (payload.sourceName ? `${payload.sourceName}` : "（不明）");
      return { id: s.id, email: submitter, origin: payload.origin, payload, warnings };
    }),
  );

  // 未対応の誤り報告（新しい順）
  const openReports = await prisma.eventReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { event: { select: { id: true, canonicalTitle: true } } },
  });

  // 直近の登録イベント（開催回・会場・カテゴリを含む）
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      venue: true,
      occurrences: { orderBy: { startsAt: "asc" }, take: 1 },
      eventCategories: { include: { category: true } },
      sources: { select: { sourceType: true, sourceUrl: true }, take: 1 },
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">管理画面</h1>
          <p className="mt-1 text-sm text-slate-500">イベントの手動登録</p>
        </div>
        <Link href="/calendar" className="text-sm text-primary hover:underline">
          カレンダー →
        </Link>
      </header>

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-800">新規イベント登録</h2>
        <EventForm categories={topCategories} action={createEvent} submitLabel="イベントを登録" />
      </section>

      {/* ユーザー投稿の審査キュー */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          審査キュー（ユーザー投稿）
          <span className="ml-1 text-sm font-normal text-slate-400">（{reviewItems.length}件）</span>
        </h2>
        {reviewItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            審査待ちの投稿はありません。
          </p>
        ) : (
          <ul className="space-y-4">
            {reviewItems.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-800">{item.payload.title || "（タイトルなし）"}</h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.origin === "ai"
                          ? "bg-violet-100 text-violet-700"
                          : item.origin === "rss"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {originBadgeLabel(item.origin)}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      審査待ち
                    </span>
                  </div>
                </div>
                <dl className="mt-2 space-y-1 text-sm text-slate-600">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-slate-400">日時</dt>
                    <dd>
                      {item.payload.startsAt ? formatJst(new Date(item.payload.startsAt)) : "—"}
                      {item.payload.endsAt ? ` 〜 ${formatJst(new Date(item.payload.endsAt))}` : ""}
                    </dd>
                  </div>
                  {item.payload.venueName && (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-slate-400">会場</dt>
                      <dd>{item.payload.venueName}</dd>
                    </div>
                  )}
                  {item.payload.description && (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-slate-400">説明</dt>
                      <dd className="whitespace-pre-wrap">{item.payload.description}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-slate-400">取得元</dt>
                    <dd>
                      {item.email}
                      {item.payload.sourceUrl?.startsWith("http") && (
                        <a
                          href={item.payload.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary hover:underline"
                        >
                          元記事 ↗
                        </a>
                      )}
                    </dd>
                  </div>
                </dl>

                {item.payload.categoryIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.payload.categoryIds.map((cid) => (
                      <span key={cid} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {categoryNameById.get(cid) ?? "不明なカテゴリ"}
                      </span>
                    ))}
                  </div>
                )}

                {/* 機械的な重複チェックの警告（仕様 3.1-7） */}
                {item.warnings.length > 0 && <DuplicateWarnings warnings={item.warnings} />}

                <div className="mt-4 flex gap-2">
                  <form action={approveSubmission}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
                      承認して公開
                    </button>
                  </form>
                  <form action={rejectSubmission}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      却下
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 誤り報告 */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          誤り報告
          <span className="ml-1 text-sm font-normal text-slate-400">（{openReports.length}件・未対応）</span>
        </h2>
        {openReports.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            未対応の報告はありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {openReports.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/events/${r.event.id}`}
                      className="font-semibold text-slate-800 hover:text-primary hover:underline"
                    >
                      {r.event.canonicalTitle}
                    </Link>
                    <p className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                        {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                      </span>
                      <span className="text-xs text-slate-400">{formatJst(r.createdAt)}</span>
                    </p>
                    {r.detail && (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600">{r.detail}</p>
                    )}
                    {r.reporterEmail && (
                      <p className="mt-1 text-xs text-slate-400">連絡先: {r.reporterEmail}</p>
                    )}
                  </div>
                  <form action={resolveReport} className="shrink-0">
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      対応済みにする
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          登録済みイベント <span className="text-sm font-normal text-slate-400">（{events.length}件）</span>
        </h2>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            まだイベントがありません。上のフォームから登録してみましょう。
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => {
              const first = e.occurrences[0];
              return (
                <li
                  key={e.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">{e.canonicalTitle}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {e.sources[0] && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {sourceBadgeLabel(e.sources[0].sourceType, e.sources[0].sourceUrl)}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          e.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {STATUS_LABEL[e.status] ?? e.status}
                      </span>
                    </div>
                  </div>
                  <dl className="mt-2 space-y-1 text-sm text-slate-600">
                    {first && (
                      <div className="flex gap-2">
                        <dt className="text-slate-400">日時</dt>
                        <dd>
                          {formatJst(first.startsAt)}
                          {first.endsAt ? ` 〜 ${formatJst(first.endsAt)}` : ""}
                        </dd>
                      </div>
                    )}
                    {e.venue && (
                      <div className="flex gap-2">
                        <dt className="text-slate-400">会場</dt>
                        <dd>{e.venue.name}</dd>
                      </div>
                    )}
                  </dl>
                  {e.eventCategories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.eventCategories.map((ec) => (
                        <span
                          key={ec.categoryId}
                          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        >
                          {ec.category.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Link
                      href={`/admin/events/${e.id}/edit`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      編集
                    </Link>
                    <DeleteEventButton eventId={e.id} title={e.canonicalTitle} />
                    <Link
                      href={`/events/${e.id}`}
                      target="_blank"
                      className="ml-auto text-xs text-primary hover:underline"
                    >
                      公開ページを見る ↗
                    </Link>
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

function DuplicateWarnings({ warnings }: { warnings: DuplicateWarning[] }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800">
        ⚠ 重複の可能性（{warnings.length}件）— 既存イベントを確認してください
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {warnings.map((w) => (
          <li key={w.eventId} className="text-xs text-amber-800">
            <Link href={`/events/${w.eventId}`} target="_blank" className="font-medium underline">
              {w.title}
            </Link>
            <span className="ml-1 text-amber-700">／ {w.reasons.join("・")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
