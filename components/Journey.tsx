"use client";

import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════
   Journey Section — Vertical Animated Timeline
   
   Replaces the old About section with a story-based timeline.
   All content from About (education, focus areas, status,
   explorations, all text paragraphs) is woven into entries.
   WhatIBuild content (Rec Systems, Data Platforms, Scalable
   Backends, Dev Tools) is also absorbed into timeline context.
   ══════════════════════════════════════════════════════ */

const timelineEntries = [
    {
        year: "2023",
        title: "Joined IIIT Pune",
        description:
            "Started B.Tech Computer Science. Built the foundation — data structures, algorithms, systems thinking. Focused on understanding how large systems are designed and maintained.",
    },
    {
        year: "2024",
        title: "Built PlayNexus",
        description:
            "Engineered a full-stack data platform with real-time APIs, multi-region price aggregation, and a custom value-scoring algorithm. First serious project combining software engineering with data-driven decision making at scale.",
    },
    {
        year: "2024",
        title: "Sheriff of Nottingham App",
        description:
            "Built a multiplayer game engine with lobby management, WebSocket-based real-time state synchronization, and turn-based game logic. Deepened understanding of backend architectures and concurrent systems.",
    },
    {
        year: "2025",
        title: "Built Ludex",
        description:
            "Architected a hybrid recommendation system fusing content-based and collaborative filtering. Evaluated on 57K+ items and 1,200 users — outperforming standalone baselines by significant margins.",
    },
    {
        year: "2025",
        title: "Completed Technical Report",
        description:
            "Completed a comprehensive technical report on hybrid recommendation systems. The work validated that thoughtful fusion of complementary ML signals yields measurably better personalization.",
    },
    {
        year: "2025",
        title: "SynthRescue & Beyond",
        description:
            "Built a real-time structural damage assessment pipeline combining YOLO detection with AI triage. Currently exploring RAG, embedding-based search, and graph-powered code intelligence systems.",
    },
];

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function Journey() {
    return (
        <section
            id="journey"
            className="py-28 md:py-36 border-t border-[rgba(255,255,255,0.04)]"
        >
            <div className="section-container">
                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <p className="label">The Path</p>
                    <h2 className="heading-lg mt-3">Journey</h2>
                </motion.div>

                {/* ── About text (preserved from original About component) ── */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-10 max-w-2xl"
                >
                    <p className="body-lg">
                        I&apos;m a Computer Science undergrad at IIIT Pune who builds at
                        the intersection of software engineering and machine learning — from
                        recommendation systems that outperform baselines to full-stack data
                        platforms serving real-time analytics.
                    </p>
                    <p className="body-lg mt-4">
                        My approach: take a complex, messy problem, architect a clean
                        solution, then ship it. I care about scalable backends,
                        well-designed APIs, and ML systems that actually work in production
                        — not just in a notebook.
                    </p>
                    <p className="mt-4 text-[var(--foreground)] font-semibold text-lg">
                        I&apos;m drawn to tools that decode complexity — making large
                        systems legible, navigable, and interactive.
                    </p>
                </motion.div>

                {/* ── Timeline ── */}
                <div className="mt-20 relative pl-8 md:pl-12">
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
                                <span className="mono text-xs text-[var(--accent)] tracking-wider">
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
                    className="mt-20 grid sm:grid-cols-3 gap-8 pt-10 border-t border-[rgba(255,255,255,0.04)]"
                >
                    <div>
                        <p className="label mb-2">Education</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            B.Tech CSE — IIIT Pune
                        </p>
                    </div>
                    <div>
                        <p className="label mb-2">Currently Exploring</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            RAG · Embeddings · Code Intelligence
                        </p>
                    </div>
                    <div>
                        <p className="label mb-2">Status</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Available for Opportunities
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
