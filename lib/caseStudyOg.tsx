import { ImageResponse } from "next/og";
import type { CaseStudy } from "@/lib/caseStudies";

/* Shared OG renderer for the three case-study routes. Same palette and grid
   motif as app/opengraph-image.tsx, but led by the project's headline metric —
   that number is the reason the link is worth opening. */

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function renderCaseStudyOg(study: CaseStudy) {
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
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                            "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                    }}
                />
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
                        {study.tag}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            marginTop: 26,
                            fontSize: 68,
                            fontWeight: 700,
                            letterSpacing: "-0.035em",
                            lineHeight: 1.05,
                            color: "#E8EDF2",
                            maxWidth: 940,
                        }}
                    >
                        {study.title}
                    </div>

                    {study.context && (
                        <div
                            style={{
                                display: "flex",
                                marginTop: 20,
                                fontSize: 26,
                                color: "#9BA9B8",
                            }}
                        >
                            {study.context}
                        </div>
                    )}

                    <div
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 24,
                            marginTop: 44,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 92,
                                fontWeight: 700,
                                letterSpacing: "-0.04em",
                                color: "#22D3EE",
                                lineHeight: 1,
                            }}
                        >
                            {study.metric}
                        </span>
                        <span style={{ fontSize: 28, color: "#9BA9B8" }}>
                            {study.metricLabel}
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 28,
                        fontSize: 22,
                        color: "#78889B",
                        borderTop: "1px solid rgba(148,163,184,0.14)",
                        paddingTop: 28,
                    }}
                >
                    <span style={{ color: "#E8EDF2" }}>
                        Aditya Harikrishnan
                    </span>
                    <span>·</span>
                    <span>{study.stack.join("  ·  ")}</span>
                </div>
            </div>
        ),
        ogSize,
    );
}
