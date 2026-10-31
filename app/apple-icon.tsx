import { ImageResponse } from "next/og";

import { SITE } from "@/lib/seo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The icon when someone adds the site to their iPhone home screen.
export default function AppleIcon() {
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
        fontSize: 120,
        fontWeight: 700,
      }}
    >
      {SITE.name.charAt(0).toUpperCase()}
    </div>,
    size,
  );
}
