// 色は「大分類のみ」が持つ（仕様 2.1 / 4.3）。colorKey → パステル色(hex) のマッピング。
// 中分類以下は colorKey=null なので、呼び出し側で親をたどって大分類の色に解決する。
export const CATEGORY_COLORS: Record<string, string> = {
  green: "#6ee7b7", // スポーツ
  pink: "#f9a8d4", // 音楽・ライブ
  amber: "#fcd34d", // 展覧会・美術館
  red: "#fca5a5", // 映画・エンタメ
  lime: "#bef264", // ゲーム・発売日
  purple: "#c4b5fd", // 祝日・カレンダー行事
  slate: "#cbd5e1", // その他
};

export const DEFAULT_COLOR = "#cbd5e1";

export function colorForKey(key?: string | null): string {
  return (key && CATEGORY_COLORS[key]) || DEFAULT_COLOR;
}
