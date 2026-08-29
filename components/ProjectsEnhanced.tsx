"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import Lightbox from "@/components/Lightbox";

/* ══════════════════════════════════════════════════════
   Projects Section — Balanced Two-Column Composition

   Visual hierarchy (non-negotiable):
   Tier 1: Ludex — full immersive case study (LudexShowcase)
   Tier 2: PlayNexus + SynthRescue — balanced companion
           projects in a matched 2-column grid

   Design rationale:
   - Equal-width columns (6:6) give both projects the
     same visual importance — they are companions, not
     a primary and its subordinate
   - Both cards share identical architecture: same bezel
     scale, heading size (heading-sm), tag style, image
     aspect ratio, highlight format, and CTA format
   - Natural variation comes from content (different
     images, descriptions, tags), not structural inequality
   - Both use compact-link CTAs (not pill buttons),
     creating a clear collective step-down from Ludex's
     btn-primary/btn-secondary treatment
   - No eyebrow label (Ludex uses the budget)
   - Section heading uses heading-lg (vs Ludex heading-xl)

   Skills applied:
   - design-taste-frontend: editorial magazine layout,
     identical containers with different stories, no
     repetitive chapter pattern, no dashboard grid
   - high-end-visual-design: double-bezel containers,
     custom cubic-bezier [0.32, 0.72, 0, 1], macro
     whitespace, button-in-button not needed (compact
     links are the right weight here)
   - full-output-enforcement: complete implementation,
     no placeholders, no truncation
   ══════════════════════════════════════════════════════ */

interface ProjectData {
    title: string;
    tag: string;
    description: string;
    highlights: string[];
    github: string;
    demo: string | null;
    images: string[];
}


const projects: ProjectData[] = [
    {
        title: "PlayNexus",
        tag: "Full Stack / Data Platform",
        description:
            "Full-stack data platform with a multi-region price aggregation pipeline, custom value-scoring algorithm, and vibe-based discovery. Engineered for data-driven decision making at scale.",
        highlights: [
            "Real-time Steam API integration",
            "Multi-region price comparison",
            "Custom value score algorithm",
            "Vibe-based game discovery system",
        ],
        github: "https://github.com/AdityaH1305/PlayNexus",
        demo: "https://playnexus-io.vercel.app",
        images: [
            "/projects/playnexus2.webp",
            "/projects/playnexus-new.webp",
            "/projects/playnexus3.webp",
            "/projects/playnexus4.webp",
            "/projects/playnexus5.webp",
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
        images: ["/projects/synth1.webp", "/projects/synth2.webp"],
    },
];

/* ═══════════════════════════════════════════════════════
   ProjectCard — Shared card architecture

   Both PlayNexus and SynthRescue use this component.
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

    const lightboxImages = project.images.map((src, i) => ({
        src,
        alt: `${project.title} screenshot ${i + 1} of ${count}`,
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
                                costs this section 5x its image weight:
                                PlayNexus is 388 KB across five shots against
                                the 27.5 KB of the one on screen, and every
                                byte of that would be fetched for a reader who
                                never touches an arrow. Swapping the src on a
                                single element does not flash either — a
                                browser keeps painting the current frame until
                                the replacement has decoded, so the transition
                                is a hold, not a blank. */}
                            <Image
                                src={project.images[current]}
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
