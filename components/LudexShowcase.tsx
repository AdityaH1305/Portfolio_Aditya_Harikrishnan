"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import Reveal from "@/components/Reveal";
import { gsap, EASE } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   LudexShowcase — Featured Work case study

   Sticky split: the narrative scrolls on the left while
   the product video holds position on the right, so the
   videos are the thing the section is built around rather
   than a band near the bottom.

   Layout order:
     header → full-width metric → split(narrative | video)
     → pipeline → stack + CTAs

   Framing is deliberately sparse. The video's double bezel
   is the ONLY framed element in the section; the pipeline
   and the tech list are borderless so they read as
   annotation rather than as more cards.
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

const stats = [
    { value: "+13%", label: "vs collaborative filtering" },
    { value: "57K+", label: "games evaluated" },
    { value: "1.2K", label: "users in dataset" },
];

const narrative = [
    {
        title: "The Problem",
        body: "Content-based filtering captures item features but misses user taste patterns. Collaborative filtering models user behavior but fails on cold-start. Neither alone delivers reliable personalization at scale.",
    },
    {
        title: "The Approach",
        body: "Fuse TF-IDF vectorization across game metadata with implicit ALS to model latent user-item interactions. Combine complementary signals into a unified ranking system that compensates for each method’s blind spots.",
    },
    {
        title: "The Result",
        body: "The hybrid system significantly outperformed both standalone baselines across all evaluation metrics. Findings validated and documented as a technical report on hybrid recommendation systems.",
    },
];

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
       is simpler than a FLIP and keeps the underline a single element.
       tabRowRef must stay position:relative and the direct offsetParent of
       the buttons, because this reads btn.offsetLeft. */
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
                <Reveal stagger={0.08}>
                    <p data-reveal-child className="label">
                        02 / Featured Work
                    </p>
                    <h2 data-reveal-child className="heading-xl mt-5">
                        Ludex
                    </h2>
                    <p data-reveal-child className="body-lg mt-6 max-w-2xl">
                        A hybrid recommendation engine that fuses content-based
                        filtering with implicit ALS (Alternating Least Squares) to
                        deliver measurably better Steam game discovery — evaluated
                        against both standalone baselines and documented in full.
                    </p>
                </Reveal>

                {/* ═══════════ HERO METRIC — full measure ═══════════
                    One number, alone. The supporting stats moved down into
                    the narrative rail: a band carrying +27% AND three more
                    numerals dilutes the headline claim, and the rail needs
                    the height for the sticky hold to have travel. */}
                <Reveal y={28} duration={0.8} className="mt-14 md:mt-20">
                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-5">
                        <span className="ludex-hero-metric">+27%</span>
                        <span className="text-base md:text-lg text-secondary max-w-[20rem] leading-snug">
                            Precision@20 improvement over content-based baseline
                        </span>
                    </div>
                </Reveal>
            </div>

            {/* ═══════════ SPLIT — narrative scrolls, video sticks ═══════════
                Vertical rhythm goes on the INNER element, never on
                .section-container: that class sets `margin: 0 auto`, and
                because it is defined after Tailwind's utilities in globals.css
                the shorthand beats `mt-*` at equal specificity — the margin
                silently computes to 0 and the sections butt together. */}
            <div className="section-container">
                {/* 5fr/7fr weights the split toward the media: these are 1280px
                    UI screen recordings whose whole value is legibility, so the
                    video column gets the larger share. */}
                <div className="mt-20 md:mt-28 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-14 lg:gap-16 items-start">
                    {/* Left: narrative. stagger mode puts the start state on the
                        children, so all three share one ScrollTrigger instead of
                        three independent ones that only looked staggered when
                        they happened to enter together. */}
                    <Reveal
                        stagger={0.1}
                        className="flex flex-col gap-14 md:gap-20"
                    >
                        {narrative.map((n) => (
                            <div key={n.title} data-reveal-child>
                                <h3 className="heading-sm">{n.title}</h3>
                                <p className="body-sm mt-3">{n.body}</p>
                            </div>
                        ))}

                        {/* Supporting stats land here as evidence directly under
                            The Result — and lengthen the rail enough that the
                            sticky panel has real travel to hold through. */}
                        <div
                            data-reveal-child
                            className="pt-8 border-t border-edge flex flex-col gap-5"
                        >
                            {stats.map((s) => (
                                <div
                                    key={s.value}
                                    className="flex items-baseline gap-3"
                                >
                                    <span className="text-2xl font-semibold text-primary tracking-tight">
                                        {s.value}
                                    </span>
                                    <span className="text-sm text-tertiary">
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Reveal>

                    {/* Right: sticky media.
                        Not wrapped in <Reveal>: the reveal must not become a
                        stretched grid item, or its height equals the row height
                        and sticky would have zero travel. The reveal goes
                        inside instead.

                        lg:mt-14 drops the tabs below the metric caption, which
                        is max-w-[20rem] and wraps into this column's x-range —
                        without it the two collide. */}
                    <div className="lg:sticky lg:top-24 lg:mt-14">
                        <Reveal y={20} duration={0.6}>
                            <div ref={mediaRef}>
                                {/* Tab selectors */}
                                <div
                                    ref={tabRowRef}
                                    className="flex gap-6 mb-4 relative"
                                >
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
                                    {/* One persistent underline slid by GSAP, rather
                                        than a per-tab element cross-faded by layout
                                        projection. */}
                                    <span
                                        ref={underlineRef}
                                        aria-hidden="true"
                                        className="absolute bottom-0 left-0 h-px w-0 bg-accent pointer-events-none"
                                    />
                                </div>

                                {/* The one framed element in the section */}
                                <div className="shell-bezel">
                                    <div className="core-bezel overflow-hidden">
                                        <div className="relative">
                                            {videos.map((v, i) => (
                                                <div
                                                    key={v.id}
                                                    className={`${
                                                        i === 0
                                                            ? ""
                                                            : "absolute inset-0"
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
                                                            videoRefs.current[i] =
                                                                el;
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
                    </div>
                </div>
            </div>

            {/* ═══════════ PIPELINE — borderless, one DOM tree ═══════════
                Replaces four bordered cards (previously duplicated across a
                desktop and a mobile tree, so StageNode mounted 8 times) with
                a hairline rule and a tick per stage.

                gap-x is 0 and the gutter comes from pr-* instead, so adjacent
                rule segments abut and each ROW reads as one unbroken line —
                including the second row of the 2×2 mobile wrap, which a single
                absolutely-positioned rule would have left without one. */}
            <div className="section-container">
            <Reveal
                stagger={0.08}
                delay={0.06}
                duration={0.6}
                className="mt-24 md:mt-32 grid grid-cols-2 md:grid-cols-4 gap-y-10"
            >
                {stages.map((s) => (
                    <div
                        key={s.step}
                        data-reveal-child
                        className="relative pt-5 pr-6 md:pr-8"
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute inset-x-0 top-0 h-px ${
                                s.accent ? "bg-accent/60" : "bg-edge"
                            }`}
                        />
                        <span
                            aria-hidden="true"
                            className={`absolute left-0 top-0 w-px h-2 ${
                                s.accent ? "bg-accent" : "bg-edge-strong"
                            }`}
                        />
                        <span
                            className={`mono text-[10px] tracking-widest ${
                                s.accent ? "text-accent" : "text-tertiary"
                            }`}
                        >
                            {s.step}
                        </span>
                        <p
                            className={`text-sm font-semibold mt-2 ${
                                s.accent ? "text-accent" : "text-primary"
                            }`}
                        >
                            {s.title}
                        </p>
                        <p className="text-[11px] text-tertiary mt-1.5 leading-snug">
                            {s.detail}
                        </p>
                    </div>
                ))}
            </Reveal>
            </div>

            {/* ═══════════ STACK + CTAs ═══════════ */}
            <div className="section-container">
                <Reveal
                    stagger={0.08}
                    className="mt-20 md:mt-24 flex flex-col items-start gap-8"
                >
                    {/* One line instead of six bordered pills */}
                    <p
                        data-reveal-child
                        className="mono text-xs text-tertiary leading-relaxed"
                    >
                        {techStack.join("  ·  ")}
                    </p>

                    <div data-reveal-child>
                        {/* The report is the strongest artifact on the site for a
                            research-adjacent internship — it gets primary weight,
                            with its size stated so nobody is ambushed on mobile. */}
                        <div className="flex flex-wrap gap-4">
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
                        </div>
                        <p className="label-muted mt-4 normal-case tracking-normal">
                            PDF · 2.1 MB
                        </p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
