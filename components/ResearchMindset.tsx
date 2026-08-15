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
                {/* ── Header — headline left, lead right ── */}
                <Reveal y={16} className="section-head">
                    <div>
                        <p className="label">Approach</p>
                        <h2 className="heading-lg mt-3">What I Build</h2>
                    </div>
                    <p className="body-lg measure-tight">
                        Systems that combine software engineering with machine
                        learning — each one shipped, measured, and running.
                    </p>
                </Reveal>

                {/* ── Capabilities ──
                    Was a `gap-px bg-edge` grid: four cells on a hairline
                    lattice, which is a table pretending to be a layout. The
                    lattice is gone and the cards are separated by space
                    instead, which is the whole move this redesign makes.
                    The padding stays — it is what gives each one its own
                    hover target — and only the lines went. */}
                <Reveal
                    stagger={0.08}
                    className="mt-14 grid md:grid-cols-2 gap-x-10 gap-y-4 lg:gap-x-16"
                >
                    {capabilities.map((item) => (
                        <div
                            key={item.title}
                            data-reveal-child
                            className="group py-8 lg:py-10 px-6 lg:px-8 -mx-6 lg:-mx-8
                                       rounded-2xl
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
                            <p className="label-muted mt-5 normal-case tracking-normal text-xs">
                                {item.evidence}
                            </p>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
