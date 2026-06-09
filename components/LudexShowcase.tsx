"use client";

import { Fragment, useState } from "react";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════
   LudexShowcase — Immersive Case Study

   The visual and narrative centerpiece of the portfolio.
   Designed to be immediately distinguishable from every
   other section through:

   - Promoted heading-xl title (same weight as the hero name)
   - Hero metric (+27%) as the dominant visual anchor
   - 3-column editorial narrative (no eyebrow labels)
   - Horizontal architecture pipeline in double-bezel
   - Tab-switched video showcase in double-bezel
   - Subtle gold background glow for section differentiation

   Design skills applied:
   - design-taste-frontend: 1 eyebrow (down from 6), custom
     cubic-bezier [0.32, 0.72, 0, 1], layout diversification
     (vertical flow, not left/right split), motion motivated
   - high-end-visual-design: double-bezel containers, macro
     whitespace (py-32 md:py-44), no banned transitions
   - full-output-enforcement: complete implementation
   ══════════════════════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

const stages: {
    step: string;
    title: string;
    detail: string;
    accent?: boolean;
}[] = [
    {
        step: "01",
        title: "Data Layer",
        detail: "57K+ games · 1.2K users",
    },
    {
        step: "02",
        title: "Dual Extraction",
        detail: "TF-IDF + Implicit ALS",
    },
    {
        step: "03",
        title: "Hybrid Fusion",
        detail: "Weighted signal combination",
        accent: true,
    },
    {
        step: "04",
        title: "Ranked Output",
        detail: "Personalized recommendations",
    },
];

const techStack = [
    "TF-IDF",
    "Implicit ALS",
    "Content-Based Filtering",
    "Collaborative Filtering",
    "Python",
    "Scikit-learn",
];

const videos = [
    { id: "dashboard", label: "Dashboard", src: "/projects/dashboard.mp4" },
    { id: "signin", label: "Sign In Flow", src: "/projects/sign_in.mp4" },
];

/* ── Architecture stage node ── */
function StageNode({
    stage,
    delay,
}: {
    stage: (typeof stages)[number];
    delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: EASE }}
            viewport={{ once: true }}
            className={`px-4 lg:px-5 py-5 border text-center ${
                stage.accent
                    ? "border-[var(--accent)] bg-[rgba(212,175,55,0.04)]"
                    : "border-[var(--border)]"
            }`}
        >
            <span
                className={`mono text-[10px] tracking-widest ${
                    stage.accent
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-tertiary)]"
                }`}
            >
                {stage.step}
            </span>
            <p
                className={`text-sm font-semibold mt-2 ${
                    stage.accent
                        ? "text-[var(--accent)]"
                        : "text-[var(--foreground)]"
                }`}
            >
                {stage.title}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 leading-snug">
                {stage.detail}
            </p>
        </motion.div>
    );
}

/* ── Horizontal arrow (desktop) ── */
function HArrow() {
    return (
        <div className="flex-shrink-0 w-8 lg:w-10 flex items-center justify-center">
            <svg
                width="20"
                height="12"
                viewBox="0 0 20 12"
                fill="none"
                className="text-[var(--accent)] opacity-40"
            >
                <path
                    d="M0 6H17M17 6L12 1M17 6L12 11"
                    stroke="currentColor"
                    strokeWidth="1"
                />
            </svg>
        </div>
    );
}

/* ── Vertical arrow (mobile) ── */
function VArrow() {
    return (
        <div className="flex justify-center py-1.5">
            <svg
                width="12"
                height="16"
                viewBox="0 0 12 16"
                fill="none"
                className="text-[var(--accent)] opacity-40"
            >
                <path
                    d="M6 0V13M6 13L1.5 8.5M6 13L10.5 8.5"
                    stroke="currentColor"
                    strokeWidth="1"
                />
            </svg>
        </div>
    );
}

/* ══════════════════════════════════════════════════════ */

export default function LudexShowcase() {
    const [activeVideo, setActiveVideo] = useState(0);

    return (
        <section id="work" className="relative py-32 md:py-44">
            {/* Subtle gold radial glow — visual differentiation
                within the dark theme, not a theme switch */}
            <div className="ludex-glow" aria-hidden="true" />

            {/* ═══════════ HEADER ═══════════ */}
            <div className="section-container">
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                    className="label"
                >
                    Featured Project
                </motion.p>

                <motion.h2
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.06, ease: EASE }}
                    viewport={{ once: true }}
                    className="heading-xl mt-4"
                >
                    Ludex
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
                    viewport={{ once: true }}
                    className="body-lg mt-5 max-w-2xl"
                >
                    A hybrid recommendation engine that fuses content-based and
                    collaborative filtering to deliver measurably better game
                    discovery. Validated through a comprehensive technical report.
                </motion.p>

                {/* ═══════════ HERO METRIC ═══════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.18, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-14 md:mt-20"
                >
                    {/* Primary metric — the anchor of recruiter memory */}
                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-5">
                        <span className="ludex-hero-metric">+27%</span>
                        <span className="text-base md:text-lg text-[var(--text-secondary)] max-w-[20rem] leading-snug">
                            Precision@20 improvement over content-based baseline
                        </span>
                    </div>

                    {/* Supporting metrics — inline, not a dashboard grid */}
                    <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 items-baseline">
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl md:text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                                +13%
                            </span>
                            <span className="text-sm text-[var(--text-tertiary)]">
                                vs collaborative filtering
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl md:text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                                57K+
                            </span>
                            <span className="text-sm text-[var(--text-tertiary)]">
                                games evaluated
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl md:text-3xl font-semibold text-[var(--foreground)] tracking-tight">
                                1.2K
                            </span>
                            <span className="text-sm text-[var(--text-tertiary)]">
                                users in dataset
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* ═══════════ NARRATIVE — 3-column editorial ═══════════ */}
                <div className="mt-20 md:mt-24 grid lg:grid-cols-3 gap-10 lg:gap-14">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE }}
                        viewport={{ once: true }}
                    >
                        <h3 className="heading-sm">The Problem</h3>
                        <p className="body-sm mt-3">
                            Content-based filtering captures item features but
                            misses user taste patterns. Collaborative filtering
                            models user behavior but fails on cold-start.
                            Neither alone delivers reliable personalization at
                            scale.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
                        viewport={{ once: true }}
                    >
                        <h3 className="heading-sm">The Approach</h3>
                        <p className="body-sm mt-3">
                            Fuse TF-IDF vectorization across game metadata with
                            implicit ALS to model latent user-item interactions.
                            Combine complementary signals into a unified ranking
                            system that compensates for each method&apos;s blind
                            spots.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
                        viewport={{ once: true }}
                    >
                        <h3 className="heading-sm">The Result</h3>
                        <p className="body-sm mt-3">
                            The hybrid system significantly outperformed both
                            standalone baselines across all evaluation metrics.
                            Findings validated and documented as a technical report
                            on hybrid recommendation systems.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* ═══════════ ARCHITECTURE PIPELINE ═══════════
                Uses a wider centered container to break out of
                the section-container left-bias. Wrapped in
                double-bezel (shell-bezel + core-bezel) for
                premium materiality.
                ═══════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                viewport={{ once: true }}
                className="mt-20 md:mt-24 px-5 md:px-10 max-w-5xl mx-auto"
            >
                <div className="shell-bezel">
                    <div className="core-bezel px-5 py-8 md:px-8 md:py-10 lg:px-10">
                        {/* Desktop: horizontal pipeline */}
                        <div className="hidden md:flex items-stretch">
                            {stages.map((s, i) => (
                                <Fragment key={s.step}>
                                    <div className="flex-1">
                                        <StageNode
                                            stage={s}
                                            delay={0.12 + i * 0.08}
                                        />
                                    </div>
                                    {i < stages.length - 1 && <HArrow />}
                                </Fragment>
                            ))}
                        </div>

                        {/* Mobile: vertical pipeline */}
                        <div className="md:hidden">
                            {stages.map((s, i) => (
                                <Fragment key={s.step}>
                                    <StageNode
                                        stage={s}
                                        delay={0.08 + i * 0.06}
                                    />
                                    {i < stages.length - 1 && <VArrow />}
                                </Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ═══════════ VIDEO SHOWCASE ═══════════
                Tab selectors sit outside the bezel for an
                editorial feel (not dashboard tab-bar-in-panel).
                Both videos are mounted; opacity crossfade avoids
                reload delay on switch.
                ═══════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                viewport={{ once: true }}
                className="mt-14 md:mt-16 px-5 md:px-10 max-w-5xl mx-auto"
            >
                {/* Tab selectors */}
                <div className="flex gap-6 mb-4">
                    {videos.map((v, i) => (
                        <button
                            key={v.id}
                            onClick={() => setActiveVideo(i)}
                            className={`text-sm font-medium pb-1.5 relative transition-colors duration-300 ${
                                activeVideo === i
                                    ? "text-[var(--foreground)]"
                                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                            }`}
                            style={{
                                transitionTimingFunction:
                                    "cubic-bezier(0.32, 0.72, 0, 1)",
                            }}
                        >
                            {v.label}
                            {activeVideo === i && (
                                <motion.div
                                    layoutId="ludex-video-tab"
                                    className="absolute bottom-0 left-0 right-0 h-px bg-[var(--accent)]"
                                    transition={{ duration: 0.3, ease: EASE }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Video in double-bezel */}
                <div className="shell-bezel">
                    <div className="core-bezel overflow-hidden">
                        <div className="relative">
                            {videos.map((v, i) => (
                                <div
                                    key={v.id}
                                    className={`${
                                        i === 0 ? "" : "absolute inset-0"
                                    } ${
                                        activeVideo === i
                                            ? "opacity-100"
                                            : "opacity-0 pointer-events-none"
                                    }`}
                                    style={{
                                        transition:
                                            "opacity 500ms cubic-bezier(0.32, 0.72, 0, 1)",
                                    }}
                                    aria-hidden={activeVideo !== i}
                                >
                                    <video
                                        src={v.src}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="w-full h-auto block"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ═══════════ TECH STACK + CTAs ═══════════ */}
            <div className="section-container">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-14 flex flex-wrap gap-2.5"
                >
                    {techStack.map((tech) => (
                        <span
                            key={tech}
                            className="px-3.5 py-1.5 text-xs mono border border-[rgba(212,175,55,0.12)]
                                       text-[var(--accent)] bg-[rgba(212,175,55,0.03)]"
                        >
                            {tech}
                        </span>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.06, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-8 flex flex-wrap gap-4"
                >
                    <a
                        href="https://ludexsite.onrender.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                    >
                        Visit Site
                        <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M7 17L17 7M17 7H7M17 7v10" />
                        </svg>
                    </a>
                    <a
                        href="https://github.com/Aditya11835/Ludex"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                    >
                        View on GitHub
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
