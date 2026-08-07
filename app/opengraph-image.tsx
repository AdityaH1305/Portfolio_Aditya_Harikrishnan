import { ImageResponse } from "next/og";

/* Generated at build time — no static asset to keep in sync with the
   design. Renders the same palette as the site. */

export const alt = "Aditya Harikrishnan — ML Systems & Full-Stack Engineering";
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
                    background: "#0B0F14",
                    padding: "72px 80px",
                    fontFamily: "sans-serif",
                }}
            >
                {/* Technical grid motif */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                    }}
                />

                {/* Accent glow */}
                <div
                    style={{
                        position: "absolute",
                        top: -180,
                        right: -120,
                        width: 620,
                        height: 620,
                        borderRadius: "50%",
                        background:
                            "radial-gradient(circle, rgba(34,211,238,0.16) 0%, rgba(34,211,238,0) 70%)",
                    }}
                />

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 22,
                            letterSpacing: "0.18em",
                            color: "#22D3EE",
                            textTransform: "uppercase",
                        }}
                    >
                        Portfolio
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            marginTop: 28,
                            fontSize: 88,
                            fontWeight: 700,
                            letterSpacing: "-0.035em",
                            lineHeight: 1,
                            color: "#E8EDF2",
                        }}
                    >
                        <span>ADITYA</span>
                        <span>HARIKRISHNAN</span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            marginTop: 32,
                            fontSize: 34,
                            color: "#9BA9B8",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Building systems, not just websites.
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 40,
                        fontSize: 22,
                        color: "#78889B",
                        borderTop: "1px solid rgba(148,163,184,0.14)",
                        paddingTop: 28,
                    }}
                >
                    <span>ML Systems</span>
                    <span>·</span>
                    <span>Full-Stack</span>
                    <span>·</span>
                    <span>IIIT Pune</span>
                    <span>·</span>
                    <span style={{ color: "#22D3EE" }}>
                        Ludex · +27% Precision@20
                    </span>
                </div>
            </div>
        ),
        size,
    );
}
