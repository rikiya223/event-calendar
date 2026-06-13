import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/site";
import { loadJpFont } from "@/lib/og";
import { colorForKey } from "@/lib/categoryColors";

export const runtime = "nodejs";
export const alt = "イベント詳細";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function jstDate(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

// イベントごとのシェアカード（タイトル・日付・会場・カテゴリ色）
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event
    .findUnique({
      where: { id },
      include: {
        venue: true,
        occurrences: { orderBy: { startsAt: "asc" }, take: 1 },
        eventCategories: { include: { category: { include: { parent: true } } } },
      },
    })
    .catch(() => null);

  const title = event?.canonicalTitle ?? SITE_NAME;
  const cat = event?.eventCategories[0]?.category;
  const accent = colorForKey(cat?.colorKey ?? cat?.parent?.colorKey ?? null);
  const catName = cat?.name ?? "";
  const dateText = event?.occurrences[0] ? jstDate(event.occurrences[0].startsAt) : "";
  const venueName = event?.venue?.name ?? "";

  const font = await loadJpFont(`${title}${catName}${dateText}${venueName}${SITE_NAME}年月日`);
  const fonts = font ? [{ name: "Noto Sans JP", data: font, weight: 700 as const, style: "normal" as const }] : [];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "white" }}>
        <div style={{ height: 18, background: accent, display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 72, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {catName ? (
              <div style={{ display: "flex", alignSelf: "flex-start", fontSize: 28, color: "#1f2937", background: `${accent}26`, padding: "8px 22px", borderRadius: 999 }}>
                {catName}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
            <div style={{ display: "flex", fontSize: title.length > 26 ? 56 : 72, fontWeight: 700, color: "#0b1020", marginTop: 28, lineHeight: 1.25 }}>
              {title}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {dateText ? <div style={{ display: "flex", fontSize: 36, color: "#374151" }}>{dateText}</div> : <div style={{ display: "flex" }} />}
            {venueName ? <div style={{ display: "flex", fontSize: 28, color: "#6b7280", marginTop: 10 }}>{venueName}</div> : <div style={{ display: "flex" }} />}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: accent, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
