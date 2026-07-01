import type { Weather, Mood } from "@prisma/client";

// Idea の天気・気分の選択肢（値=DBの列挙値、label=日本語表示）。
// フィルター・詳細表示のラベルは同じ文字列を使う（ユーザー指定：表示とフィルターの言葉を分けない）。
export const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: "SUNNY", label: "晴れ" },
  { value: "CLOUDY", label: "くもり" },
  { value: "RAINY", label: "雨" },
  { value: "SNOWY", label: "雪" },
];

export const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: "REFRESH", label: "リフレッシュ" },
  { value: "CALM", label: "落ち着き" },
  { value: "EXCITED", label: "わくわく" },
  { value: "LIVELY", label: "わいわい" },
  { value: "RELAXED", label: "のんびり" },
  { value: "FOCUS", label: "集中" },
];

// CSV等、日本語ラベルの自由入力から列挙値への変換（未知の文字列は null）。
export function weatherFromLabel(label: string): Weather | null {
  return WEATHER_OPTIONS.find((o) => o.label === label.trim())?.value ?? null;
}

export function moodFromLabel(label: string): Mood | null {
  return MOOD_OPTIONS.find((o) => o.label === label.trim())?.value ?? null;
}
