"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import CtaRow from "@/components/CtaRow";
import { CASE_STUDIES } from "@/lib/caseStudies";
import VideoPlayer from "@/components/VideoPlayer";
import { useTabUnderline } from "@/lib/useTabUnderline";

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

const STUDY = CASE_STUDIES[1];

/* Sourced from the registry rather than written here, so this rail and the
   home-page stage cannot drift. The rail keeps three blocks because the
   sticky video panel opposite needs its height for travel. */
const narrative = [
    { title: "What it is", body: STUDY.intro },
    { title: "How it works", body: STUDY.how },
    { title: "The result", body: STUDY.resultNote },
];

/* ══════════════════════════════════════════════════════ */

export default function LudexShowcase() {
    const [activeVideo, setActiveVideo] = useState(0);
    const [inView, setInView] = useState(false);
    /* Index of the video open in the expanded player; null = closed. */
    const [expanded, setExpanded] = useState<number | null>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const mediaRef = useRef<HTMLDivElement>(null);

    const { rowRef: tabRowRef, tabRefs, underlineRef } =
        useTabUnderline(activeVideo);

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
            if (inView && i === activeVideo && expanded === null) {
                el.play().catch(() => {
                    /* autoplay can be refused; the poster stays up */
                });
            } else {
                el.pause();
            }
        });
    }, [activeVideo, inView, expanded]);

    return (
        <article>
            {/* Eyebrow and title live in CaseStudyHero — this is a route
                now, so that block owns the page's <h1>. */}
            {/* No deck paragraph — the narrative rail's "What it is" block
                below says the same thing, and the hero above already carries
                the title and the metric. */}

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
                            className="pt-8 flex flex-col gap-5"
                        >
                            {stats.map((s) => (
                                <div
                                    key={s.value}
                                    className="flex items-baseline gap-3"
                                >
                                    <span className="heading-sm text-primary">
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
                                        {/* "expand", not "play": these inline
                                            videos have no click handler at
                                            all — they autoplay on scroll and
                                            the only action here is the
                                            Expand button. Labelling it PLAY
                                            promised a click that did
                                            nothing. */}
                                        <div
                                            data-cursor="expand"
                                            className="relative group/media"
                                        >
                                            {/* Expand control. Overlaid rather
                                                than placed in the flow so the
                                                inline layout is unchanged. */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpanded(activeVideo)
                                                }
                                                aria-label={`Expand ${videos[activeVideo].label} video`}
                                                className="absolute top-3 right-3 z-10 flex items-center gap-2
                                                           px-3 py-2 rounded-full
                                                           bg-surface-0/90 backdrop-blur-sm border border-edge-strong
                                                           text-secondary hover:text-accent hover:border-accent
                                                           opacity-0 group-hover/media:opacity-100 focus-visible:opacity-100
                                                           transition-all duration-200"
                                            >
                                                <svg
                                                    width="13"
                                                    height="13"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                                                </svg>
                                                <span className="mono text-xs tracking-widest uppercase">
                                                    Expand
                                                </span>
                                            </button>

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
                            className={`mono text-xs tracking-widest ${
                                s.accent ? "text-accent" : "text-tertiary"
                            }`}
                        >
                            {s.step}
                        </span>
                        <p
                            className={`text-sm font-medium mt-2 ${
                                s.accent ? "text-accent" : "text-primary"
                            }`}
                        >
                            {s.title}
                        </p>
                        <p className="text-xs text-tertiary mt-1.5 leading-snug">
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
                        {/* Links come from the registry — the stage on the
                            home page renders this same row from the same
                            data. */}
                        <CtaRow ctas={STUDY.ctas} />
                    </div>
                </Reveal>
            </div>

            {expanded !== null && (
                <VideoPlayer
                    src={videos[expanded].src}
                    poster={videos[expanded].poster}
                    label={videos[expanded].label}
                    onClose={() => setExpanded(null)}
                />
            )}
        </article>
    );
}
