import { ImageResponse } from "next/og";

export const alt =
  "UlcerShield AI — AI-Powered Digital Twin for Real-Time Pressure Ulcer Prevention";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "linear-gradient(135deg, #030b16 0%, #0b1e33 50%, #0e3252 100%)",
          fontFamily: "sans-serif",
          color: "#e8f3ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              background: "linear-gradient(135deg, #22d3ee 0%, #0891b2 60%, #0b3d63 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              color: "white",
              boxShadow: "0 20px 60px -10px rgba(6,182,212,0.55)",
            }}
          >
            🛡
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>UlcerShield AI</div>
            <div
              style={{
                fontSize: 15,
                color: "#9ab6d6",
                textTransform: "uppercase",
                letterSpacing: 3,
                marginTop: 4,
              }}
            >
              Bedsore Prevention Platform
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            Predict pressure injuries
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              background:
                "linear-gradient(90deg, #22d3ee 0%, #67e8f9 40%, #38bdf8 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            before the tissue breaks.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 20,
            fontSize: 20,
            color: "#9ab6d6",
          }}
        >
          <span>Digital Tissue Twin</span>
          <span>·</span>
          <span>Remaining Safe Tissue Time</span>
          <span>·</span>
          <span>Claude-powered</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
