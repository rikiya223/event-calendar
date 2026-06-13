import { prisma } from "@/lib/prisma";
import type { IngestResult } from "./holidays";

// TMDb（The Movie Database）の無料API。日本の映画公開日を取り込む。
// クレジット表示が必要：「TMDbのデータを使用（TMDb非公認）」。
const TMDB_BASE = "https://api.themoviedb.org/3";
const MAX_PAGES = 3;

type TmdbMovie = {
  id: number;
  title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
};

export async function ingestTmdbMovies(): Promise<IngestResult> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY が未設定です。");

  const cat = await prisma.category.findFirst({ where: { name: "公開日" } });
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let created = 0;
  let skipped = 0;
  let scanned = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${TMDB_BASE}/movie/upcoming?api_key=${key}&language=ja-JP&region=JP&page=${page}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`TMDbの取得に失敗しました (HTTP ${res.status})`);
    const data = (await res.json()) as { results?: TmdbMovie[] };
    const results = data.results ?? [];
    if (results.length === 0) break;

    for (const m of results) {
      if (!m.release_date || !m.title) continue;
      if (m.release_date < today) continue; // 公開済みはスキップ
      scanned++;

      // 1映画につき1イベント（安定キー＝TMDbの作品URL）。再実行で重複しない。
      const sourceUrl = `https://www.themoviedb.org/movie/${m.id}`;
      const existing = await prisma.eventSource.findFirst({
        where: { sourceType: "OFFICIAL_API", sourceUrl },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.event.create({
        data: {
          canonicalTitle: `映画『${m.title}』`,
          description: m.overview || null,
          status: "PUBLISHED", // 公式・高信頼なので自動公開
          confidenceScore: 85,
          occurrences: {
            create: { startsAt: new Date(`${m.release_date}T00:00:00+09:00`), endsAt: null },
          },
          sources: {
            create: {
              sourceType: "OFFICIAL_API",
              sourceUrl,
              trustWeight: 85,
              rawPayload: {
                id: m.id,
                title: m.title,
                release_date: m.release_date,
                poster_path: m.poster_path,
                provider: "TMDB",
              },
            },
          },
          eventCategories: cat ? { create: [{ categoryId: cat.id }] } : undefined,
        },
      });
      created++;
    }
  }

  return { created, skipped, scanned };
}
