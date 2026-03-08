import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cateros – The Event Operations Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0C1220 0%, #1A2538 50%, #0C1220 100%)",
          padding: "60px",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #D4A373, #E8C9A0, #D4A373)",
          }}
        />

        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #D4A373, #E8C9A0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 700,
              color: "#0C1220",
            }}
          >
            C
          </div>
          <span
            style={{
              fontSize: "36px",
              fontWeight: 600,
              color: "#F4F1ED",
              letterSpacing: "-0.5px",
            }}
          >
            Cateros
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "#F4F1ED",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "24px",
            letterSpacing: "-1px",
          }}
        >
          The Event Operations Platform
        </div>

        {/* Subheadline */}
        <div
          style={{
            fontSize: "24px",
            color: "#D4A373",
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: "800px",
          }}
        >
          Proposals, pricing, staffing, vendors, and client approvals — all in one place.
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "48px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["Events", "Proposals", "Pricing", "Staffing", "Vendors", "Payments"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "10px 24px",
                  borderRadius: "9999px",
                  border: "1px solid #2A3A5C",
                  background: "rgba(26, 37, 56, 0.8)",
                  color: "#D4A373",
                  fontSize: "16px",
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "18px",
            color: "#6B7A90",
          }}
        >
          cateros.com
        </div>
      </div>
    ),
    { ...size }
  );
}
