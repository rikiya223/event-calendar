"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getComments, postComment, deleteComment } from "./comment-actions";

type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  canDelete: boolean;
};

const MAX_LEN = 500;

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(iso));
}

export function Comments({ eventId }: { eventId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = () =>
    getComments(eventId).then((r) => {
      setCanPost(r.canPost);
      setComments(r.comments);
      setLoaded(true);
    });

  useEffect(() => {
    let alive = true;
    getComments(eventId).then((r) => {
      if (!alive) return;
      setCanPost(r.canPost);
      setComments(r.comments);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [eventId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await postComment(eventId, body);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      await refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteComment(id);
      await refresh();
    });
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-on-surface-variant">
        コメント{loaded && comments.length > 0 ? `（${comments.length}）` : ""}
      </h2>

      {/* 投稿フォーム（ログイン時のみ） */}
      {loaded && (
        canPost ? (
          <form onSubmit={onSubmit} className="mb-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
              placeholder="このイベントについてコメント…"
              rows={3}
              className="w-full resize-none rounded-xl border border-outline-variant/40 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-outline">{body.length}/{MAX_LEN}</span>
              <button
                type="submit"
                disabled={pending || body.trim().length === 0}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "送信中…" : "投稿"}
              </button>
            </div>
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </form>
        ) : (
          <p className="mb-4 rounded-xl border border-outline-variant/40 bg-white p-3 text-sm text-on-surface-variant">
            コメントするには{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">ログイン</Link>
            {" "}してください。
          </p>
        )
      )}

      {/* 一覧 */}
      {!loaded ? (
        <p className="text-sm text-outline">読み込み中…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-outline">まだコメントはありません。</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-outline-variant/40 bg-white p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary-container text-[11px] font-semibold text-secondary">
                    {c.authorName[0]?.toUpperCase()}
                  </span>
                  <span className="font-medium text-on-surface">{c.authorName}</span>
                  <span className="text-outline">{relTime(c.createdAt)}</span>
                </span>
                {c.canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    disabled={pending}
                    className="shrink-0 text-[11px] text-outline transition hover:text-error disabled:opacity-50"
                  >
                    削除
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-on-surface">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
