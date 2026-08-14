"use client";

import Reveal from "@/components/Reveal";

/* ══════════════════════════════════════════════════════
   Approach — What I Build

   Replaces a generic Research/Experiment/Measure/Iterate
   pillar list. Every capability here names the project
   that proves it, so the section says something only this
   portfolio can say.

   Keeps id="research" — the atlas and SideNav index
   against it.
   ══════════════════════════════════════════════════════ */

/* Every entry names the project that proves it. That constraint is the
   section's whole point, so entry 04's old evidence — "Currently exploring" —
   was the one thing it could not say. It has been replaced with the ISRO
   work, which is both real and the strongest item on the site. */
const capabilities = [
    {
        number: "01",
        title: "Biometric Recognition",
        description:
            "Recognition that holds up when the camera angle changes or frames go missing.",
        evidence: "Gait Fusion · ISRO / LPSC · 98.00% Rank-1 on CASIA-B",
    },
    {
        number: "02",
        title: "Medical Image Segmentation",
        description:
            "Medical scans outlined automatically, extended past the published baseline.",
        evidence: "Modified Double U-Net · 95.94% mean IoU · ternary extension",
    },
    {
        number: "03",
        title: "Recommendation Systems",
        description:
            "Two recommendation methods blended so each covers the other's blind spot.",
        evidence: "Ludex · TF-IDF + implicit ALS · +27% Precision@20",
    },
    {
        number: "04",
        title: "Data-Driven Platforms",
        description:
            "Live APIs, analytics pipelines and custom scoring, with vision in the loop.",
        evidence: "PlayNexus · multi-region pipeline  ·  SynthRescue · YOLO triage",
    },
];

export default function ResearchMindset() {
    return (
        <section id="research" className="section-y section-divide">
            <div className="section-container">
                {/* ── Header ── */}
                <Reveal y={16}>
                    <p className="label">Approach</p>
                    <h2 className="heading-lg mt-3">What I Build</h2>
                    <p className="body-lg mt-4 measure-tight">
                        Systems that combine software engineering with machine
                        learning — each one shipped, measured, and running.
                    </p>
                </Reveal>

                {/* ── Capabilities — bordered grid on a hairline ── */}
                <Reveal
                    stagger={0.08}
                    className="mt-14 grid md:grid-cols-2 gap-px bg-edge"
                >
                    {capabilities.map((item) => (
                        <div
                            key={item.title}
                            data-reveal-child
                            className="group bg-surface-0 p-8 lg:p-10
                                       transition-colors duration-300
                                       hover:bg-surface-1"
                        >
                            <span
                                className="mono text-xs text-tertiary
                                           group-hover:text-accent
                                           transition-colors duration-300"
                            >
                                {item.number}
                            </span>
                            <h3
                                className="heading-sm mt-3
                                           group-hover:text-accent
                                           transition-colors duration-300"
                            >
                                {item.title}
                            </h3>
                            <p className="body-sm mt-3">{item.description}</p>
                            <p className="label-muted mt-5 normal-case tracking-normal text-[0.75rem]">
                                {item.evidence}
                            </p>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
