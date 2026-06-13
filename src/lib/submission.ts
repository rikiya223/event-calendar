// ユーザー投稿（event_submissions.payload）に格納する内容の型。
export type SubmissionPayload = {
  title: string;
  startsAt: string; // ISO 文字列
  endsAt?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  venueRegion?: string | null;
  description?: string | null;
  categoryIds: string[];
  // 取得元メタ（RSS/AI取り込みが審査キューに入れるときに使用。ユーザー投稿では null）
  origin?: "user" | "rss" | "ai" | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

// Prisma の Json 値を SubmissionPayload として安全に読む
export function asSubmissionPayload(value: unknown): SubmissionPayload {
  const v = (value ?? {}) as Partial<SubmissionPayload>;
  return {
    title: v.title ?? "",
    startsAt: v.startsAt ?? "",
    endsAt: v.endsAt ?? null,
    venueName: v.venueName ?? null,
    venueAddress: v.venueAddress ?? null,
    venueRegion: v.venueRegion ?? null,
    description: v.description ?? null,
    categoryIds: Array.isArray(v.categoryIds) ? v.categoryIds : [],
    origin: v.origin ?? null,
    sourceName: v.sourceName ?? null,
    sourceUrl: v.sourceUrl ?? null,
  };
}
