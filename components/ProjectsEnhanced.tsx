"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import Lightbox from "@/components/Lightbox";

/* ══════════════════════════════════════════════════════
   Experiments — two companion projects, matched

   Verdict + SynthRescue in a 2-column grid, both given the
   same weight: same bezel scale, heading size (heading-sm),
   tag style, image aspect ratio, highlight format and CTA
   format. They are companions, not a primary and its
   subordinate, so the variation comes from content rather
   than from structure.

   Both use compact-link CTAs rather than pill buttons, which
   keeps the whole section a step below the case studies in
   `#work` without needing a second layout.

   ── Two sources per shot, and that is the point ──
   Verdict's screenshots are full-page captures — up to
   5760x5628, near-square or portrait. Fed straight into the
   card's `aspect-[16/10]` `object-cover` box they centre-crop
   to an unreadable middle band, and the headline metric is
   the first thing lost. So a `Shot` carries TWO files: a
   hand-checked 16:10 crop for the card, and the whole region
   at full resolution for the lightbox. See the `Shot` docs.
   ══════════════════════════════════════════════════════ */

/**
 * One screenshot, in its two forms.
 *
 * `card` is a 16:10 crop, so the card's `object-cover` box has nothing left
 * to trim; `full` is the same view uncropped, which is what "zoom" is for.
 * They were one field, and that only worked while every shot happened to be
 * a wide browser capture — a full-page one loses its most important third to
 * the crop, silently and with no error anywhere.
 *
 * `w`/`h` are the natural size of `full`, not of `card`. Lightbox reads them
 * to pick its layout: above h/w 1.2 it renders at native width and lets the
 * overlay scroll, instead of fitting a tall page into 72vh where it would be
 * far smaller than the card it was opened from.
 */
interface Shot {
    card: string;
    full: string;
    w: number;
    h: number;
    /** Optional line under the image in the lightbox. */
    caption?: string;
}

interface ProjectData {
    title: string;
    tag: string;
    description: string;
    highlights: string[];
    github: string;
    demo: string | null;
    images: Shot[];
}


const projects: ProjectData[] = [
    {
        title: "Verdict",
        tag: "Applied ML / Payments",
        description:
            "Diagnoses why a payment failed, then decides the economically correct recovery action — instead of treating failure as one undifferentiated bucket. Two models and an agent: one classifies the failure, one estimates the odds a retry would work, and only then is anything decided. Built for the Razorpay AI Buildathon.",
        highlights: [
            "XGBoost failure classifier — 0.943 accuracy vs 0.809 for a decline-code lookup",
            "92.5% of recoverable revenue captured using 46% fewer retry attempts",
            "Fraud hard-block proven by construction — 207 diagnosed, 0 actioned, 0 scored",
            "Calibrated recovery model with uncertainty intervals, across 166 tests",
        ],
        github: "https://github.com/AdityaH1305/Verdict",
        demo: "https://verdict-1v70.onrender.com/",
        images: [
            {
                card: "/projects/verdict1.webp",
                full: "/projects/verdict1-full.webp",
                w: 1736,
                h: 2200,
                caption:
                    "The pinned 300-payment batch: ₹1,00,744 recovered of ₹4,42,395 failed, and 52.8% of everything acted on came back.",
            },
            {
                card: "/projects/verdict2.webp",
                full: "/projects/verdict2-full.webp",
                w: 2200,
                h: 1406,
                caption:
                    "Every rupee, end to end — what failed, why, what Verdict did about it, and where it ended up.",
            },
            {
                card: "/projects/verdict3.webp",
                full: "/projects/verdict3-full.webp",
                w: 2200,
                h: 1007,
                caption:
                    "Four policies over the same 1,600 held-out payments. No policy can see the outcome it is scored against.",
            },
            {
                card: "/projects/verdict4.webp",
                full: "/projects/verdict4-full.webp",
                w: 2200,
                h: 1375,
                caption:
                    "Net value depends entirely on what one retry costs, so the whole range is swept rather than one flattering figure reported.",
            },
            {
                card: "/projects/verdict5.webp",
                full: "/projects/verdict5-full.webp",
                w: 2200,
                h: 1604,
                caption:
                    "The retry loop was built without a cap first, on purpose. The cap costs 21 recoveries, and the dashboard says so.",
            },
            {
                card: "/projects/verdict6.webp",
                full: "/projects/verdict6-full.webp",
                w: 2200,
                h: 1593,
                caption:
                    "Any decision expands into the reasoning behind it — grounded in a verified table of published decline codes, never invented.",
            },
        ],
    },
    {
        title: "SynthRescue",
        tag: "AI / Computer Vision",
        description:
            "Real-time structural damage assessment pipeline combining YOLO-based detection with AI-assisted triage for rapid deployment in disaster response.",
        highlights: [
            "Real-time image upload and analysis pipeline",
            "YOLO-based structural damage detection",
            "AI-generated emergency response reports using Gemini",
        ],
        github: "https://github.com/AdityaH1305/SynthRescue",
        demo: "https://synthrescue.vercel.app/",
        /* Card and full are the same file here: both are ordinary browser
           captures that already read correctly at 16:10. The `w`/`h` are still
           worth passing — synth2 is portrait (640x871), and without them the
           lightbox fits it to 72vh and renders it NARROWER than the card it
           was opened from. */
        images: [
            {
                card: "/projects/synth1.webp",
                full: "/projects/synth1.webp",
                w: 1918,
                h: 797,
            },
            {
                card: "/projects/synth2.webp",
                full: "/projects/synth2.webp",
                w: 640,
                h: 871,
            },
        ],
    },
];

/* ═══════════════════════════════════════════════════════
   ProjectCard — Shared card architecture

   Both Verdict and SynthRescue use this component.
   Identical structure ensures visual parity:
   - Double-bezel hero image (16:10 aspect)
   - Click-to-lightbox with gallery navigation
   - Compact tag + heading-sm title
   - Body description (unclamped — let content breathe)
   - Highlight list with gold dash markers
   - Compact-link CTAs (GitHub + optional Live Demo)

   The stagger index controls entrance animation delay
   so the two cards reveal in sequence left-to-right.
   ═══════════════════════════════════════════════════════ */
/* The card's paging arrows.

   Deliberately NOT the lightbox's `arrowBase`. That one carries
   `border-edge-strong` and sits inside a `bg-surface-0/95` pill because it
   floats over a dimmed backdrop and needs an edge to be found against it —
   which is the exact case globals.css still allows a hairline for. These sit
   on the page ground, where this design removed outlines from everything, so
   the emphasis is colour and a surface that appears on hover instead.

   36px is the tap target, not the glyph. A `‹` is a few pixels wide and the
   padding is what makes it hittable on a phone. */
const navArrow =
    "w-9 h-9 rounded-full flex items-center justify-center " +
    "text-xl leading-none pb-0.5 text-tertiary " +
    "hover:text-accent hover:bg-surface-1 " +
    "transition-colors duration-200";

function ProjectCard({
    project,
    staggerIndex,
}: {
    project: ProjectData;
    staggerIndex: number;
}) {
    /* ONE index for both the card and the lightbox, plus a boolean for
       whether the lightbox is up.

       This replaced a lone `lightboxIndex: number | null` whose comment said
       tracking the index alone "avoids keeping src and index in sync as two
       pieces of state" — right when the card was a fixed hero, wrong now that
       the card pages too. Two INDICES would be the thing that comment warns
       about; an index and an open flag cannot disagree about which image is
       showing. It also means the lightbox opens on whatever the card is
       displaying rather than always on the first shot, and closing it leaves
       the card where the reader navigated to. */
    const [current, setCurrent] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const count = project.images.length;
    const canPage = count > 1;

    /* Wraps, like the lightbox's own arrows. Wrapping is what lets both
       controls stay permanently enabled — a disabled button at each end is
       two more states to style and reason about for no gain in a five-shot
       gallery. */
    const goPrev = () => setCurrent((i) => (i - 1 + count) % count);
    const goNext = () => setCurrent((i) => (i + 1) % count);

    /* The lightbox opens `full`, never `card`. The card's source is a 16:10
       crop, so handing it to the viewer would make "zoom" show exactly what
       was already on screen, only larger and no more complete. `w`/`h` go
       with it because Lightbox picks its layout from them. */
    const lightboxImages = project.images.map((shot, i) => ({
        src: shot.full,
        alt: `${project.title} screenshot ${i + 1} of ${count}`,
        w: shot.w,
        h: shot.h,
        caption: shot.caption,
    }));

    const baseDelay = staggerIndex * 0.1;

    return (
        <div>
            {/* Hero image in double-bezel */}
            <Reveal y={28} duration={0.8} delay={0.06 + baseDelay}>
                <div className="shell-bezel compact-bezel">
                    <div className="core-bezel overflow-hidden">
                        <div
                            data-cursor="zoom"
                            className="relative w-full aspect-[16/10] cursor-pointer group/card-img"
                            onClick={() => setLightboxOpen(true)}
                        >
                            {/* ONE <Image> whose `src` swaps, NOT every shot
                                stacked and cross-faded.

                                Stacking is the tidier-looking option and it
                                costs this section several times its image
                                weight: Verdict is 316 KB across six card
                                crops against the 42 KB of the one on screen,
                                and every byte of that would be fetched for a
                                reader who never touches an arrow. The `full`
                                sources are heavier still and are not fetched
                                at all until the lightbox opens. Swapping the src on a
                                single element does not flash either — a
                                browser keeps painting the current frame until
                                the replacement has decoded, so the transition
                                is a hold, not a blank. */}
                            <Image
                                src={project.images[current].card}
                                alt={`${project.title} screenshot ${current + 1} of ${count}`}
                                fill
                                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/card-img:scale-[1.02]"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                /* `priority` is deprecated as of Next 16 in
                                   favour of `preload`, which says what it
                                   actually does.

                                   Tied to the FIRST shot as well as the first
                                   card: preloading is an LCP measure, and once
                                   the reader has paged away this is no longer
                                   the image that paints on arrival. */
                                preload={staggerIndex === 0 && current === 0}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Paging, BELOW the frame rather than over it ──
                    The lightbox puts its own arrows under the image for the
                    same reason: a control laid over a screenshot covers the
                    thing it exists to let you look at. This also replaces the
                    "+N more" badge that used to sit at bottom-right INSIDE the
                    frame — a counter that states the position says everything
                    the badge said, and says it without standing on the shot.

                    Outside the clickable image div on purpose, so pressing an
                    arrow can never also open the lightbox. That is structural
                    rather than a stopPropagation call, which is the kind of
                    guard that silently stops working when the markup moves. */}
                {canPage && (
                    <div className="gallery-nav mt-3 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={goPrev}
                            className={navArrow}
                            aria-label={`Previous ${project.title} screenshot`}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            onClick={goNext}
                            className={navArrow}
                            aria-label={`Next ${project.title} screenshot`}
                        >
                            ›
                        </button>
                        <span className="mono text-xs text-tertiary tabular-nums ml-1.5">
                            {current + 1} / {count}
                        </span>
                    </div>
                )}
            </Reveal>

            {/* Content */}
            <Reveal y={14} delay={0.16 + baseDelay} className="mt-7">
                {/* label-muted, not a bespoke `compact-tag`: the design system
                    declares exactly two micro-label classes, and this is the
                    same semantic slot CaseStudyHero fills with label-muted. */}
                <span className="label-muted block">{project.tag}</span>
                <h3 className="heading-sm mt-2.5">{project.title}</h3>
                <p className="body-sm mt-3">{project.description}</p>

                {/* Highlights */}
                <ul className="mt-5 space-y-2.5">
                    {project.highlights.map((item, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-secondary leading-snug"
                        >
                            <span className="text-accent mt-0.5 text-xs shrink-0">
                                ─
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>

                {/* CTA links */}
                <div className="mt-7 flex gap-4 items-center">
                    <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="compact-link"
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                        >
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        GitHub
                    </a>
                    {project.demo && (
                        <a
                            href={project.demo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="compact-link compact-link--accent"
                        >
                            <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                viewBox="0 0 24 24"
                            >
                                <path d="M7 17L17 7M17 7H7M17 7v10" />
                            </svg>
                            Live Demo
                        </a>
                    )}
                </div>
            </Reveal>

            {/* `onNavigate` writes the SAME index the card reads, so paging
                inside the lightbox and paging on the card are one motion and
                closing leaves the card on whatever the reader stopped at. */}
            {lightboxOpen && (
                <Lightbox
                    images={lightboxImages}
                    index={current}
                    onNavigate={setCurrent}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   Main Section — Balanced Two-Column Composition
   ══════════════════════════════════════════════════════ */
export default function ProjectsEnhanced() {
    return (
        <section id="projects" className="section-y section-divide">
            {/* Section heading */}
            <div className="section-container">
                <Reveal y={16} className="section-head">
                    {/* "Projects" moved up to #work, so this section takes the
                        name that always described it better: the smaller
                        builds, without a measured baseline behind them. */}
                    <div>
                        <p className="label">Also Built</p>
                        <h2 className="heading-lg mt-3">Experiments</h2>
                    </div>
                    <p className="body-lg max-w-lg">
                        Data platforms, applied AI, and full-stack engineering.
                    </p>
                </Reveal>
            </div>

            {/* Balanced 2-column grid */}
            <div className="section-container">
                <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 lg:gap-10 items-start">
                    {projects.map((project, i) => (
                        <ProjectCard
                            key={project.title}
                            project={project}
                            staggerIndex={i}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
