import { ImageResponse } from "next/og";

import { SITE } from "@/lib/seo";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The browser tab icon: the first letter of the product name on a dark tile.
export default function Icon() {
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
        fontSize: 42,
        fontWeight: 700,
        border: "3px solid #e8c382",
        borderRadius: 16,
      }}
    >
      {SITE.name.charAt(0).toUpperCase()}
    </div>,
    size,
  );
}
