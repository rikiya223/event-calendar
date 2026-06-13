// カレンダーの日付計算ユーティリティ。
// 開催回(EventOccurrence)はUTCで保存されているため、表示・集計はすべて JST(+09:00) 基準で行う。
// JSTはサマータイムが無いので「24時間 = 1日」の単純な加算で日境界を扱える。

export const JST_OFFSET_MIN = 540; // +09:00
const DAY_MS = 86_400_000;

export type CalView = "month" | "week" | "day";
export type Ymd = { y: number; m: number; d: number }; // m は 0始まり

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// UTCのDate → JSTの壁時計に変換した擬似Date（getUTC* で読む用）
function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MIN * 60_000);
}

// JSTの暦日(y,m,d)の 0:00 を表す、実際のUTC時刻
export function jstMidnightUtc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - JST_OFFSET_MIN * 60_000);
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS);
}

// UTC Date が属する JST 暦日の情報
export function jstParts(date: Date): Ymd & { weekday: number } {
  const j = toJst(date);
  return {
    y: j.getUTCFullYear(),
    m: j.getUTCMonth(),
    d: j.getUTCDate(),
    weekday: j.getUTCDay(), // 0=日
  };
}

// 集計用のキー "YYYY-MM-DD"（JST基準）
export function jstDayKey(date: Date): string {
  const p = jstParts(date);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
}

export function ymdKey(ymd: Ymd): string {
  return `${ymd.y}-${pad(ymd.m + 1)}-${pad(ymd.d)}`;
}

// 開催回が表示範囲 [rangeStart, rangeEnd) で「乗る」JST暦日キーの一覧を返す。
// ・単日（endsAt が無い／開始と同じ暦日）→ 開始日のみ。
// ・複数日にまたがる会期（展覧会・映画祭など）→ 期間中の各日に乗せる（範囲でクリップ）。
export function occurrenceDayKeys(
  startsAt: Date,
  endsAt: Date | null,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const startKey = jstDayKey(startsAt);
  if (!endsAt || jstDayKey(endsAt) === startKey) return [startKey];
  const lowerMs = Math.max(startsAt.getTime(), rangeStart.getTime());
  const upperMs = Math.min(endsAt.getTime(), rangeEnd.getTime() - 1);
  if (upperMs < lowerMs) return [startKey];
  const lp = jstParts(new Date(lowerMs));
  let cursor = jstMidnightUtc(lp.y, lp.m, lp.d);
  const keys: string[] = [];
  while (cursor.getTime() <= upperMs) {
    keys.push(jstDayKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys.length ? keys : [startKey];
}

// <input type="datetime-local"> の壁時計文字列 "YYYY-MM-DDTHH:mm"(JST想定) を
// 正しいUTC Date に変換する。new Date(s) はサーバーのローカルTZで解釈されてしまうため
// （ローカル=JSTの開発機では正しく、UTCで動く本番=Vercelでは9時間ズレる）、
// 必ず +09:00 を明示してTZ非依存にする。不正な文字列は Invalid Date を返す。
export function parseJstLocal(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s.trim());
  if (!m) return new Date(NaN);
  const [, y, mo, d, h, mi, se] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se ?? "00"}+09:00`);
}

// "YYYY-MM-DD" をパース（不正なら今日のJST暦日）
export function parseDateParam(s?: string | null): Ymd {
  if (s) {
    const mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (mm) return { y: +mm[1], m: +mm[2] - 1, d: +mm[3] };
  }
  return todayJst();
}

export function todayJst(): Ymd {
  const p = jstParts(new Date());
  return { y: p.y, m: p.m, d: p.d };
}

// 表示する範囲（UTCの半開区間 [start, end)）と、並べる日セルを返す
export function buildRange(view: CalView, anchor: Ymd) {
  const anchorStart = jstMidnightUtc(anchor.y, anchor.m, anchor.d);

  if (view === "day") {
    const days = [anchorStart];
    return { start: anchorStart, end: addDays(anchorStart, 1), days };
  }

  if (view === "week") {
    const wd = jstParts(anchorStart).weekday; // 0=日
    const weekStart = addDays(anchorStart, -wd);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return { start: weekStart, end: addDays(weekStart, 7), days };
  }

  // month: その月を含む 6週間(42日)のグリッド（日曜始まり）
  const first = jstMidnightUtc(anchor.y, anchor.m, 1);
  const firstWd = jstParts(first).weekday;
  const gridStart = addDays(first, -firstWd);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return { start: gridStart, end: addDays(gridStart, 42), days };
}

// 前後の移動先 anchor を計算
export function shiftAnchor(view: CalView, anchor: Ymd, dir: -1 | 1): Ymd {
  if (view === "month") {
    return { y: anchor.y, m: anchor.m + dir, d: 1 }; // Date正規化に任せる
  }
  const step = view === "week" ? 7 : 1;
  const p = jstParts(addDays(jstMidnightUtc(anchor.y, anchor.m, anchor.d), step * dir));
  return { y: p.y, m: p.m, d: p.d };
}

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function formatJstTime(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function formatJstDateLong(ymd: Ymd): string {
  const d = jstMidnightUtc(ymd.y, ymd.m, ymd.d);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
}
