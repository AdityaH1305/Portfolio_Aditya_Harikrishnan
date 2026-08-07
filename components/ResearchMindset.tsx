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

const capabilities = [
    {
        number: "01",
        title: "Recommendation Systems",
        description:
            "Hybrid models that fuse collaborative and content-based signals into a single ranking.",
        evidence: "Ludex · TF-IDF + implicit ALS · +27% Precision@20",
    },
    {
        number: "02",
        title: "Data-Driven Platforms",
        description:
            "Applications built on real-time APIs, analytics pipelines, and custom scoring systems.",
        evidence: "PlayNexus · multi-region price pipeline · value scoring",
    },
    {
        number: "03",
        title: "Applied Computer Vision",
        description:
            "Detection pipelines that turn raw imagery into structured, actionable output.",
        evidence: "SynthRescue · YOLO detection + Gemini triage",
    },
    {
        number: "04",
        title: "Intelligent Developer Tools",
        description:
            "Systems that make large codebases legible — retrieval, embeddings, and code intelligence.",
        evidence: "Currently exploring",
    },
];

export default function ResearchMindset() {
    return (
        <section id="research" className="section-y section-divide">
            <div className="section-container">
                {/* ── Header ── */}
                <Reveal y={16}>
                    <p className="label">04 / Approach</p>
                    <h2 className="heading-lg mt-3">What I Build</h2>
                    <p className="body-lg mt-4 max-w-xl">
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
