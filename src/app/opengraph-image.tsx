import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { loadJpFont } from "@/lib/og";

export const runtime = "nodejs";
export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// サイト共通の既定OGP画像（個別ページに opengraph-image が無いときに使われる）
export default async function Image() {
  const font = await loadJpFont(SITE_NAME + SITE_DESCRIPTION);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #004ac6, #2563eb)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700 }}>{SITE_NAME}</div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 28, opacity: 0.92, maxWidth: 960, lineHeight: 1.5 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Noto Sans JP", data: font, weight: 700 as const, style: "normal" as const }] : [] },
  );
}
