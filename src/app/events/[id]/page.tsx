import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { colorForKey } from "@/lib/categoryColors";
import { googleCalendarUrl } from "@/lib/googleCalendar";
import { BookmarkButton } from "./BookmarkButton";
import { BackLink } from "./BackLink";
import { ShareButton } from "./ShareButton";
import { ReportButton } from "./ReportButton";

// ページ本体は認証・searchParams に依存しない作りにしたが、共通レイアウト（Header/Sidebar/
// BottomNav）がログイン状態をサーバ側で描画するため、ここを静的キャッシュするとログイン中の
// ユーザーにログアウト表示が焼き込まれてしまう。よってページHTMLは動的のままにする。
// （重い部分のOGP画像は別ルートでレイアウト非依存のためキャッシュ済み。）
// レイアウト認証をクライアント側に移せばこのページもキャッシュ可能（将来対応）。
export const dynamic = "force-dynamic";

function formatJstFull(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

function formatJstTime(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { canonicalTitle: true, description: true },
  });
  if (!event) return { title: "イベント" };
  const description = event.description?.slice(0, 120) ?? `${event.canonicalTitle}の開催情報をチェック。`;
  return {
    title: event.canonicalTitle,
    description,
    openGraph: {
      type: "article",
      title: event.canonicalTitle,
      description,
      url: `/events/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: event.canonicalTitle,
      description,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      occurrences: { orderBy: { startsAt: "asc" } },
      eventCategories: { include: { category: true } },
      eventPerformers: { include: { performer: true } },
      sources: true,
    },
  });

  if (!event) notFound();

  // ヒーロー色：イベントのカテゴリから大分類の色を解決（子は親をたどる）
  const allCategories = await prisma.category.findMany({
    select: { id: true, colorKey: true, parentId: true },
  });
  const catById = new Map(allCategories.map((c) => [c.id, c]));
  function resolveColorKey(categoryId: string): string | null {
    let cur = catById.get(categoryId);
    while (cur && !cur.colorKey && cur.parentId) cur = catById.get(cur.parentId);
    return cur?.colorKey ?? null;
  }
  const heroKey = event.eventCategories
    .map((ec) => resolveColorKey(ec.categoryId))
    .find((k) => k);
  const heroColor = colorForKey(heroKey);

  // 取得元のうち http(s) のURLを持つものを「出典リンク」として表示
  function sourceLabel(url: string): string {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (host.includes("themoviedb")) return "TMDb で見る";
      return host;
    } catch {
      return "出典";
    }
  }
  const sourceLinks = event.sources
    .filter((s) => s.sourceUrl?.startsWith("http"))
    .map((s) => ({ url: s.sourceUrl as string, label: sourceLabel(s.sourceUrl as string) }));

  const locationText = event.venue
    ? [event.venue.name, event.venue.address].filter(Boolean).join(" ")
    : "";
  const mapQuery = event.venue
    ? event.venue.lat != null && event.venue.lng != null
      ? `${event.venue.lat},${event.venue.lng}`
      : event.venue.address || event.venue.name
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl pb-40 md:pb-28">
      {/* ヒーロー（カテゴリカラー背景） */}
      <header
        className="px-5 pb-8 pt-6"
        style={{ background: `linear-gradient(160deg, ${heroColor}, ${heroColor}99)` }}
      >
        <div className="flex items-center justify-between">
          <Suspense fallback={<span className="text-sm text-on-surface/70">← カレンダーに戻る</span>}>
            <BackLink />
          </Suspense>
          <ShareButton title={event.canonicalTitle} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-on-surface">{event.canonicalTitle}</h1>
        {event.eventCategories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {event.eventCategories.map((ec) => (
              <span
                key={ec.categoryId}
                className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-on-surface-variant"
              >
                {ec.category.icon ? `${ec.category.icon} ` : ""}
                {ec.category.name}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="space-y-6 px-5 pt-6">
        {/* 日時（開催回ごと） */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">日時</h2>
          <ul className="space-y-2">
            {event.occurrences.map((occ) => (
              <li
                key={occ.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-white p-3"
              >
                <div>
                  <p className="font-medium text-on-surface">{formatJstFull(occ.startsAt)}</p>
                  {occ.endsAt && (
                    <p className="text-xs text-on-surface-variant">〜 {formatJstTime(occ.endsAt)} 終了</p>
                  )}
                </div>
                <a
                  href={googleCalendarUrl({
                    title: event.canonicalTitle,
                    start: occ.startsAt,
                    end: occ.endsAt,
                    details: event.description ?? undefined,
                    location: locationText || undefined,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-outline-variant/50 bg-white px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low"
                >
                  📅 追加
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* 会場＋地図 */}
        {event.venue && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">会場</h2>
            <div className="overflow-hidden rounded-xl border border-outline-variant/40 bg-white">
              <div className="p-3">
                <p className="font-medium text-on-surface">{event.venue.name}</p>
                {event.venue.address && (
                  <p className="mt-0.5 text-sm text-on-surface-variant">{event.venue.address}</p>
                )}
              </div>
              {mapQuery && (
                <iframe
                  title="会場の地図"
                  className="h-56 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                />
              )}
            </div>
          </section>
        )}

        {/* 出演者・チーム */}
        {event.eventPerformers.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">出演者・チーム</h2>
            <div className="flex flex-wrap gap-2">
              {event.eventPerformers.map((ep) => (
                <span key={ep.performerId} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-on-surface-variant">
                  {ep.performer.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 説明 */}
        {event.description && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">説明</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
              {event.description}
            </p>
          </section>
        )}

        {/* 出典・関連リンク（取得元の透明性／クレジット） */}
        {sourceLinks.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">出典・リンク</h2>
            <ul className="space-y-1">
              {sourceLinks.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {s.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 情報の誤り報告 */}
        <section className="border-t border-outline-variant/30 pt-4">
          <ReportButton eventId={event.id} />
        </section>
      </div>

      {/* アクションバー（画面下固定。スマホは下部ナビの上に表示） */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-outline-variant/40 bg-white/95 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 py-3">
          {/* 未ログイン時はクリックで /login へ誘導（BookmarkButton内で処理） */}
          <BookmarkButton eventId={event.id} />
          <a
            href={googleCalendarUrl({
              title: event.canonicalTitle,
              start: event.occurrences[0]?.startsAt ?? new Date(),
              end: event.occurrences[0]?.endsAt,
              details: event.description ?? undefined,
              location: locationText || undefined,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
          >
            📅 カレンダーに追加
          </a>
        </div>
      </div>
    </main>
  );
}
