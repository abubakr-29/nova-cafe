import { ImageResponse } from "next/og";

import { SITE } from "@/lib/seo";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture shown when the link is shared on WhatsApp, LinkedIn, X and so on.
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "radial-gradient(circle at 80% 0%, rgba(232,195,130,0.28), rgba(11,11,13,0) 55%), #070707",
        color: "#f5f2ea",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 30,
          letterSpacing: 6,
          color: "#e8c382",
          textTransform: "uppercase",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            alignItems: "center",
            justifyContent: "center",
            border: "3px solid #e8c382",
            borderRadius: 18,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          {SITE.name.charAt(0).toUpperCase()}
        </div>
        {SITE.name}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          Guests order. You serve.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 36,
            color: "rgba(245,242,234,0.6)",
          }}
        >
          {SITE.tagline}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: "rgba(245,242,234,0.4)",
        }}
      >
        Powered by {SITE.company}
      </div>
    </div>,
    size,
  );
}
