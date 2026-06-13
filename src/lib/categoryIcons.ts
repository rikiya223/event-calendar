// 大分類 → Material Symbols アイコン名（ホーム・探すで共用）
export const CATEGORY_ICON: Record<string, string> = {
  スポーツ: "sports_soccer",
  "音楽・ライブ": "music_note",
  "展覧会・美術館": "palette",
  "映画・エンタメ": "movie",
  "ゲーム・発売日": "sports_esports",
  "祝日・カレンダー行事": "celebration",
  その他: "category",
};

export function categoryIcon(name: string): string {
  return CATEGORY_ICON[name] ?? "category";
}
