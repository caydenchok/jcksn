import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.company} — ${BRAND.agent}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080808",
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* gold accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 12,
            background: BRAND.gold,
            display: "flex",
          }}
        />

        {/* top: company */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 30,
              color: "#a1a1aa",
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            {BRAND.company}
          </div>
        </div>

        {/* middle: agent + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 800, color: "#ffffff", lineHeight: 1.05 }}>
            {BRAND.agent}
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 38, color: BRAND.gold, fontWeight: 700 }}>
            {BRAND.jobTitle} · {BRAND.ren}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: "#d4d4d8" }}>
            {BRAND.tagline}
          </div>
        </div>

        {/* bottom: services + location */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {BRAND.services.map((s) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#080808",
                  background: BRAND.gold,
                  padding: "10px 28px",
                  borderRadius: 12,
                  letterSpacing: 2,
                }}
              >
                {s.toUpperCase()}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>
            {BRAND.region}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
