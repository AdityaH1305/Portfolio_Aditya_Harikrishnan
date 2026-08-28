"use client";

import Reveal from "@/components/Reveal";

/* ══════════════════════════════════════════════════════
   Journey Section — Vertical Animated Timeline
   
   Replaces the old About section with a story-based timeline.
   All content from About (education, focus areas, status,
   explorations, all text paragraphs) is woven into entries.
   WhatIBuild content (Rec Systems, Data Platforms, Scalable
   Backends, Dev Tools) is also absorbed into timeline context.
   ══════════════════════════════════════════════════════ */

/* Career beats only. The project descriptions and their metrics live
   in #work and #projects — repeating them here was the third telling
   of the same three projects. */
const timelineEntries = [
    {
        year: "2023",
        title: "Joined IIIT Pune",
        description:
            "Started B.Tech Computer Science — data structures, algorithms, and how large systems hold together.",
    },
    {
        year: "2024",
        title: "First platform shipped",
        description:
            "PlayNexus took me from coursework to production: real APIs, real pipelines, real usage.",
    },
    {
        year: "2025",
        title: "Moved into ML systems",
        description:
            "Ludex was the turn toward research — build a recommender, then measure it honestly.",
    },
    {
        year: "2025",
        title: "Applied AI, end to end",
        description:
            "SynthRescue put computer vision into a full pipeline, from upload to report.",
    },
    {
        /* 2026, not 2025. The internship ran June–July 2026; the earlier year
           was wrong and is corrected here. It still sits immediately before
           "What's next", so the timeline stays in ascending order. */
        year: "2026",
        /* NBSP between "at" and "ISRO": at a 320px viewport the title is
           265.9px against a 240px box, and the natural break widows "ISRO"
           on a line of its own. Bound, it breaks earlier and evenly. */
        title: "Research & ML internship at ISRO",
        description:
            "Cross-view gait recognition at the Liquid Propulsion Systems Centre — 98.00% Rank-1 on CASIA-B, with an honest account of where occlusion breaks it.",
    },
    {
        year: "2026",
        title: "What's next",
        description:
            "Exploring RAG, embedding search and code intelligence — tools that make big systems legible.",
    },
];

export default function Journey() {
    return (
        <section id="journey" className="section-y section-divide">
            <div className="section-container">
                {/* ── Header ──
                    The about paragraph is the right-hand column rather than a
                    block 12rem below the heading. It was always the lead for
                    this section; stacking it just made the section open with
                    two short lines and a lot of nothing. */}
                <Reveal y={16} className="section-head">
                    <div>
                        <p className="label">The Path</p>
                        <h2 className="heading-lg mt-3">Journey</h2>
                    </div>
                    <p className="body-lg measure">
                        A Computer Science undergrad at IIIT Pune, building at
                        the intersection of software engineering and machine
                        learning. I like problems where the answer has to be
                        measured rather than asserted.
                    </p>
                </Reveal>

                {/* ── Timeline ── */}
                <div className="mt-16 relative pl-8 md:pl-12">
                    {/* Vertical line */}
                    <div className="timeline-line" />

                    <div className="space-y-16">
                        {timelineEntries.map((entry) => (
                            <Reveal
                                key={`${entry.year}-${entry.title}`}
                                x={-16}
                                y={0}
                                className="relative"
                            >
                                {/* Timeline dot */}
                                <div className="timeline-dot" />

                                {/* Year */}
                                <span className="mono text-xs text-accent tracking-wider">
                                    {entry.year}
                                </span>

                                {/* Title */}
                                <h3 className="heading-sm mt-2">{entry.title}</h3>

                                {/* Description */}
                                <p className="body-sm mt-3 max-w-lg">
                                    {entry.description}
                                </p>
                            </Reveal>
                        ))}
                    </div>
                </div>

                {/* ── Current Status (preserved from About) ── */}
                <Reveal
                    y={12}
                    className="mt-16 grid sm:grid-cols-3 gap-10"
                >
                    <div>
                        <p className="label mb-2">Education</p>
                        <p className="text-sm text-secondary">
                            B.Tech CSE — IIIT Pune
                        </p>
                    </div>
                    <div>
                        <p className="label mb-2">Currently Exploring</p>
                        <p className="text-sm text-secondary">
                            RAG · Embeddings · Code Intelligence
                        </p>
                    </div>
                    <div>
                        <p className="label mb-2">Status</p>
                        <p className="text-sm text-secondary">
                            Available for Opportunities
                        </p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
