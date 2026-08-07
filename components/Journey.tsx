"use client";

import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";

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
            "Started B.Tech Computer Science. Built the foundation — data structures, algorithms, and how large systems are designed and maintained.",
    },
    {
        year: "2024",
        title: "First platform shipped",
        description:
            "PlayNexus took me from coursework to production concerns: real-time APIs, data pipelines, and decisions that had to survive contact with real usage.",
    },
    {
        year: "2025",
        title: "Moved into ML systems",
        description:
            "Ludex was the turn toward research — building a recommender, then evaluating it honestly against baselines and writing up the result.",
    },
    {
        year: "2025",
        title: "Applied AI, end to end",
        description:
            "SynthRescue put computer vision into a full response pipeline, from upload to generated report.",
    },
    {
        year: "2026",
        title: "What's next",
        description:
            "Exploring RAG, embedding-based search, and graph-powered code intelligence — tools that make large systems legible.",
    },
];

export default function Journey() {
    return (
        <section id="journey" className="section-y section-divide">
            <div className="section-container">
                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <p className="label">06 / The Path</p>
                    <h2 className="heading-lg mt-3">Journey</h2>
                </motion.div>

                {/* ── About text (preserved from original About component) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-12 max-w-2xl"
                >
                    <p className="body-lg">
                        I&apos;m a Computer Science undergrad at IIIT Pune who builds at
                        the intersection of software engineering and machine learning — from
                        recommendation systems that outperform baselines to full-stack data
                        platforms serving real-time analytics.
                    </p>
                    <p className="body-lg mt-5">
                        My approach: take a complex, messy problem, architect a clean
                        solution, then ship it. I care about scalable backends,
                        well-designed APIs, and ML systems that actually work in production
                        — not just in a notebook.
                    </p>
                    <p className="mt-6 text-primary font-semibold text-lg">
                        I&apos;m drawn to tools that decode complexity — making large
                        systems legible, navigable, and interactive.
                    </p>
                </motion.div>

                {/* ── Timeline ── */}
                <div className="mt-24 relative pl-8 md:pl-12">
                    {/* Vertical line */}
                    <div className="timeline-line" />

                    <div className="space-y-16">
                        {timelineEntries.map((entry, i) => (
                            <motion.div
                                key={`${entry.year}-${entry.title}`}
                                initial={{ opacity: 0, x: -16 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{
                                    duration: 0.5,
                                    delay: i * 0.05,
                                    ease: EASE,
                                }}
                                viewport={{ once: true }}
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
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* ── Current Status (preserved from About) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-20 grid sm:grid-cols-3 gap-10 pt-10 border-t border-edge"
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
                </motion.div>
            </div>
        </section>
    );
}
