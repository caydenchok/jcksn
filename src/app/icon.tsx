import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Branded favicon: gold "88" on black, matching the ZERO88 mark.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080808",
          color: BRAND.gold,
          fontSize: 34,
          fontWeight: 800,
          fontFamily: "sans-serif",
          borderRadius: 12,
        }}
      >
        88
      </div>
    ),
    { ...size }
  );
}
