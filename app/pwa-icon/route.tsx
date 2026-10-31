import { ImageResponse } from "next/og";

import { SITE } from "@/lib/seo";

// Home-screen icons named in the web app manifest: /pwa-icon?size=192 or 512.
export function GET(request: Request) {
  const asked = Number(new URL(request.url).searchParams.get("size"));
  const side = asked === 512 ? 512 : 192;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070707",
        color: "#e8c382",
        fontSize: side * 0.6,
        fontWeight: 700,
      }}
    >
      {SITE.name.charAt(0).toUpperCase()}
    </div>,
    { width: side, height: side },
  );
}
