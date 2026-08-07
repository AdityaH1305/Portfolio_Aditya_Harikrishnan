"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import Reveal from "@/components/Reveal";
import { gsap, EASE } from "@/lib/motion";

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
    {
        id: "dashboard",
        label: "Dashboard",
        src: "/projects/dashboard.mp4",
        poster: "/projects/dashboard-poster.webp",
    },
    {
        id: "signin",
        label: "Sign In Flow",
        src: "/projects/sign_in.mp4",
        poster: "/projects/sign_in-poster.webp",
    },
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
        <Reveal
            y={12}
            delay={delay}
            className={`px-4 lg:px-5 py-5 border text-center ${
                stage.accent
                    ? "border-accent bg-accent/5"
                    : "border-edge-default"
            }`}
        >
            <span
                className={`mono text-[10px] tracking-widest ${
                    stage.accent
                        ? "text-accent"
                        : "text-tertiary"
                }`}
            >
                {stage.step}
            </span>
            <p
                className={`text-sm font-semibold mt-2 ${
                    stage.accent
                        ? "text-accent"
                        : "text-primary"
                }`}
            >
                {stage.title}
            </p>
            <p className="text-[11px] text-tertiary mt-1.5 leading-snug">
                {stage.detail}
            </p>
        </Reveal>
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
                className="text-accent opacity-40"
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
                className="text-accent opacity-40"
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
    const [inView, setInView] = useState(false);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const mediaRef = useRef<HTMLDivElement>(null);
    const tabRowRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const underlineRef = useRef<HTMLSpanElement>(null);

    /* Slide the tab underline. Replaces Framer's layoutId projection with a
       direct measurement — the two tabs are siblings in a flex row, so this
       is simpler than a FLIP and keeps the underline a single element. */
    useGSAP(
        () => {
            const move = (animate: boolean) => {
                const btn = tabRefs.current[activeVideo];
                const bar = underlineRef.current;
                if (!btn || !bar) return;
                gsap.to(bar, {
                    x: btn.offsetLeft,
                    width: btn.offsetWidth,
                    duration: animate ? 0.3 : 0,
                    ease: EASE,
                    overwrite: "auto",
                });
            };

            move(false);

            /* Re-measure after the webfont swaps in: next/font uses
               display:swap, so button widths change once Space Grotesk
               replaces the fallback and the underline would be stale. */
            const row = tabRowRef.current;
            const ro = new ResizeObserver(() => move(false));
            if (row) ro.observe(row);
            document.fonts?.ready.then(() => move(false));

            return () => ro.disconnect();
        },
        { dependencies: [activeVideo] },
    );

    /* Both videos used to mount with autoPlay and merely crossfade, so
       both downloaded (6.4 MB) and both decoded forever — including the
       hidden one. `preload="none"` alone isn't enough: calling play()
       starts the fetch regardless. So playback is gated on the media
       block actually being on screen. A visitor who never scrolls this
       far downloads zero video bytes. */
    useEffect(() => {
        const el = mediaRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { rootMargin: "200px 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        videoRefs.current.forEach((el, i) => {
            if (!el) return;
            if (inView && i === activeVideo) {
                el.play().catch(() => {
                    /* autoplay can be refused; the poster stays up */
                });
            } else {
                el.pause();
            }
        });
    }, [activeVideo, inView]);

    return (
        <section id="work" className="relative section-y section-divide">
            {/* Subtle accent radial glow — visual differentiation
                within the dark theme, not a theme switch */}
            <div className="ludex-glow" aria-hidden="true" />

            {/* ═══════════ HEADER ═══════════ */}
            <div className="section-container">
                <Reveal
                    as="p"
                    y={10}
                    className="label"
                >
                    02 / Featured Work
                </Reveal>

                <Reveal
                    as="h2"
                    y={24}
                    duration={0.7}
                    delay={0.06}
                    className="heading-xl mt-5"
                >
                    Ludex
                </Reveal>

                <Reveal
                    as="p"
                    y={14}
                    delay={0.12}
                    className="body-lg mt-6 max-w-2xl"
                >
                    A hybrid recommendation engine that fuses content-based
                    filtering with implicit ALS (Alternating Least Squares) to
                    deliver measurably better Steam game discovery — evaluated
                    against both standalone baselines and documented in full.
                </Reveal>

                {/* ═══════════ HERO METRIC ═══════════ */}
                <Reveal
                    y={28}
                    duration={0.8}
                    delay={0.18}
                    className="mt-14 md:mt-20"
                >
                    {/* Primary metric — the anchor of recruiter memory */}
                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-5">
                        <span className="ludex-hero-metric">+27%</span>
                        <span className="text-base md:text-lg text-secondary max-w-[20rem] leading-snug">
                            Precision@20 improvement over content-based baseline
                        </span>
                    </div>

                    {/* Supporting metrics — inline, not a dashboard grid */}
                    <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4 items-baseline">
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl md:text-3xl font-semibold text-primary tracking-tight">
                                +13%
                            </span>
                            <span className="text-sm text-tertiary">
                                vs collaborative filtering
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl md:text-3xl font-semibold text-primary tracking-tight">
                                57K+
                            </span>
                            <span className="text-sm text-tertiary">
                                games evaluated
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl md:text-3xl font-semibold text-primary tracking-tight">
                                1.2K
                            </span>
                            <span className="text-sm text-tertiary">
                                users in dataset
                            </span>
                        </div>
                    </div>
                </Reveal>

                {/* ═══════════ NARRATIVE — 3-column editorial ═══════════ */}
                <div className="mt-20 md:mt-24 grid lg:grid-cols-3 gap-10 lg:gap-14">
                    <Reveal
                        y={16}
                    >
                        <h3 className="heading-sm">The Problem</h3>
                        <p className="body-sm mt-3">
                            Content-based filtering captures item features but
                            misses user taste patterns. Collaborative filtering
                            models user behavior but fails on cold-start.
                            Neither alone delivers reliable personalization at
                            scale.
                        </p>
                    </Reveal>

                    <Reveal
                        y={16}
                        delay={0.08}
                    >
                        <h3 className="heading-sm">The Approach</h3>
                        <p className="body-sm mt-3">
                            Fuse TF-IDF vectorization across game metadata with
                            implicit ALS to model latent user-item interactions.
                            Combine complementary signals into a unified ranking
                            system that compensates for each method&apos;s blind
                            spots.
                        </p>
                    </Reveal>

                    <Reveal
                        y={16}
                        delay={0.16}
                    >
                        <h3 className="heading-sm">The Result</h3>
                        <p className="body-sm mt-3">
                            The hybrid system significantly outperformed both
                            standalone baselines across all evaluation metrics.
                            Findings validated and documented as a technical report
                            on hybrid recommendation systems.
                        </p>
                    </Reveal>
                </div>
            </div>

            {/* ═══════════ ARCHITECTURE PIPELINE ═══════════
                Uses a wider centered container to break out of
                the section-container left-bias. Wrapped in
                double-bezel (shell-bezel + core-bezel) for
                premium materiality.
                ═══════════════════════════════════════════════ */}
            <Reveal
                y={20}
                duration={0.6}
                delay={0.1}
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
            </Reveal>

            {/* ═══════════ VIDEO SHOWCASE ═══════════
                Tab selectors sit outside the bezel for an
                editorial feel (not dashboard tab-bar-in-panel).
                Both videos are mounted; opacity crossfade avoids
                reload delay on switch.
                ═══════════════════════════════════════ */}
            <Reveal
                y={20}
                duration={0.6}
                delay={0.1}
                className="mt-14 md:mt-16 px-5 md:px-10 max-w-5xl mx-auto"
            >
                {/* mediaRef sits inside the Reveal: it gates video download on
                    visibility, which is independent of the reveal animation. */}
                <div ref={mediaRef}>
                {/* Tab selectors */}
                <div ref={tabRowRef} className="flex gap-6 mb-4 relative">
                    {videos.map((v, i) => (
                        <button
                            key={v.id}
                            ref={(el) => {
                                tabRefs.current[i] = el;
                            }}
                            onClick={() => setActiveVideo(i)}
                            className={`text-sm font-medium pb-1.5 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                activeVideo === i
                                    ? "text-primary"
                                    : "text-tertiary hover:text-secondary"
                            }`}
                        >
                            {v.label}
                        </button>
                    ))}
                    {/* One persistent underline slid by GSAP, rather than a
                        per-tab element cross-faded by layout projection. */}
                    <span
                        ref={underlineRef}
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 h-px w-0 bg-accent pointer-events-none"
                    />
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
                                        ref={(el) => {
                                            videoRefs.current[i] = el;
                                        }}
                                        src={v.src}
                                        poster={v.poster}
                                        preload="none"
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
                </div>
            </Reveal>

            {/* ═══════════ TECH STACK + CTAs ═══════════ */}
            <div className="section-container">
                <Reveal
                    y={12}
                    className="mt-14 flex flex-wrap gap-2.5"
                >
                    {techStack.map((tech) => (
                        <span
                            key={tech}
                            className="px-3.5 py-1.5 text-xs mono border border-accent/20
                                       text-accent bg-[rgb(var(--accent-rgb) / 0.03)]"
                        >
                            {tech}
                        </span>
                    ))}
                </Reveal>

                <Reveal
                    y={12}
                    delay={0.06}
                    className="mt-10 flex flex-wrap gap-4"
                >
                    {/* The report is the strongest artifact on the site for a
                        research-adjacent internship — it gets primary weight,
                        with its size stated so nobody is ambushed on mobile. */}
                    <a
                        href="/ludex-technical-report.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                    >
                        Read the Technical Report
                        <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path d="M7 17L17 7M17 7H7M17 7v10" />
                        </svg>
                    </a>
                    <a
                        href="https://ludexsite.onrender.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                    >
                        Visit Site
                    </a>
                    <a
                        href="https://github.com/AdityaH1305/Ludex"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                    >
                        View on GitHub
                    </a>
                </Reveal>

                <p className="label-muted mt-4 normal-case tracking-normal">
                    PDF · 2.1 MB
                </p>
            </div>
        </section>
    );
}
