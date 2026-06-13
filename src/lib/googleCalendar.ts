// Googleカレンダー「予定を追加」テンプレートURLを組み立てる（仕様 3.1-8）。
// dates は UTC の YYYYMMDDTHHMMSSZ 形式。

function fmtUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(opts: {
  title: string;
  start: Date;
  end?: Date | null;
  details?: string;
  location?: string;
}): string {
  // 終了が無ければ2時間後を仮の終了にする
  const end = opts.end ?? new Date(opts.start.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmtUtc(opts.start)}/${fmtUtc(end)}`,
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
