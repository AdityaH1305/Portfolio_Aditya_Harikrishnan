"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import Lightbox from "@/components/Lightbox";

/* ══════════════════════════════════════════════════════
   Experiments — three companion projects, matched

   Verdict, PlayNexus and SynthRescue, all given the same
   weight: same bezel scale, heading size (heading-sm), tag
   style, image aspect ratio, highlight format and CTA
   format. They are companions, not a primary and its
   subordinates, so the variation comes from content rather
   than from structure.

   ── Three across only where three fit ──
   At 1280 and up a third of the column is ~330px, which holds
   a heading-sm title and the highlights comfortably. At 1024
   it would be ~245px, which does not. So the GRID is one
   column until xl, and each CARD reshapes for the width it
   is given instead:

     < 1024      stacked: image, then text, capped at 42rem
     1024-1279   a row: image 55%, text beside it
     >= 1280     stacked again, three across

   ── One baseline for the links ──
   Cards in a row are stretched to the row's height and the
   GitHub / Live Demo row is pushed to the bottom with
   `mt-auto`. The three descriptions run to different lengths;
   without this the link rows sat at three different heights,
   which is what makes a row of companions read as leftovers.

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
        /* Back after a rebuild. It left this section in Sep 2026 as a Flask
           monolith with hardcoded data; this is the Oct 2026 rewrite. Every
           number below is one the PlayNexus repo itself states or contains —
           the README's backtest table, config.py's sixteen regions,
           data/pool.json's 1,050 games, services/'s 24 modules.

           The screenshots are captured from the live site and cropped so the
           first one reads at the same scale as Verdict's — roughly 700 CSS px
           of UI across a card. A full-width page shrunk into a third of a row
           reads as texture next to it. */
        title: "PlayNexus",
        tag: "Full Stack / Data Platform",
        description:
            "A Steam buying guide: what a game costs in 16 regions at live exchange rates, a value score built from real playtime, and a buy-now-or-wait call backed by two years of price history. Rebuilt as one Flask app on Vercel with no build step.",
        highlights: [
            "Buy-or-wait rules backtested over 34,257 replayed days — when it says wait for the next big sale, it is right 96% of the time",
            "16 Steam regions priced at live exchange rates, with a daily Postgres price history on a Vercel cron",
            "Similar games by cosine similarity on Steam user-tag vectors, across a discovery pool of over 1,000 games",
            "Rebuilt from a Flask monolith into a 24-module services layer with its own design system and pytest suite",
        ],
        github: "https://github.com/AdityaH1305/PlayNexus",
        demo: "https://playnexus-io.vercel.app",
        images: [
            {
                card: "/projects/playnexus1.webp",
                full: "/projects/playnexus1-full.webp",
                w: 1920,
                h: 2100,
                caption:
                    "Every game gets a 0–100 value score from typical playtime, review quality and review count, at the price in your own region.",
            },
            {
                card: "/projects/playnexus2.webp",
                full: "/projects/playnexus2-full.webp",
                w: 1920,
                h: 1200,
                caption:
                    "Buy now or wait: a call from the game's own price history, Steam's seasonal sales and its discount rules, with the facts behind it.",
            },
            {
                card: "/projects/playnexus3.webp",
                full: "/projects/playnexus3-full.webp",
                w: 1920,
                h: 1320,
                caption:
                    "One game priced in all 16 Steam regions at live exchange rates, measured against the US price.",
            },
            {
                card: "/projects/playnexus4.webp",
                full: "/projects/playnexus4-full.webp",
                w: 1920,
                h: 1740,
                caption:
                    "Where is Steam cheapest? A regional price index across Steam's most popular paid games, each region against the US.",
            },
            {
                card: "/projects/playnexus5.webp",
                full: "/projects/playnexus5-full.webp",
                w: 1920,
                h: 1920,
                caption:
                    "Discover: pick up to three vibes built from Steam's own user tags, then filter by price, reviews, length and Steam Deck.",
            },
            {
                card: "/projects/playnexus6.webp",
                full: "/projects/playnexus6-full.webp",
                w: 1920,
                h: 1560,
                caption:
                    "The home page: what is being played right now, and the best deals of the day.",
            },
        ],
    },
    {
        title: "SynthRescue",
        tag: "AI / Computer Vision",
        /* Rewritten to stand beside the other two. The old copy was one
           sentence and three five-word bullets — with the link rows aligned
           across the row, that left ~217px of nothing above this card's links
           at 1440, and it read as the unfinished one. Everything here is from
           the SynthRescue README: the V3 model's results, the dataset split
           and the pipeline. Recall is stated alongside precision on purpose;
           the precision alone would be the flattering half. */
        description:
            "Finds people trapped under rubble in drone imagery, then writes the dispatch report. Real photos of people buried in a collapse barely exist, so the training data was made: a procedural Blender engine rendered heavily occluded victims, merged with real disaster images. Built for the Solution Challenge 2026.",
        highlights: [
            "YOLOv8 at 96.7% survivor precision and 73.7% recall, trained on ~6,100 images — 3,000 synthetic, 3,115 real",
            "No hand labelling: YOLO boxes computed from Blender mesh vertices projected through the scene camera",
            "Rubble-only images kept as empty-label negatives, which is what taught it to ignore broken concrete",
            "FastAPI inference on Google Cloud Run, Gemini dispatch reports, and a Next.js command console on Vercel",
        ],
        github: "https://github.com/AdityaH1305/SynthRescue",
        demo: "https://synthrescue.vercel.app/",
        /* These used to be one file for card and full, under a comment saying
           both "already read correctly at 16:10". Neither did: synth1 is
           1918x797 (2.41:1) and synth2 is 640x871 portrait, so `object-cover`
           cut the sides off one and more than half the height off the other —
           which is why this card looked unlike its neighbours.

           Now Verdict's treatment: the originals are the `full` files, pixel
           for pixel, and the cards are deliberate 16:10 crops of the part worth
           seeing — the detection panel, and the summary block. Both crops are
           at native resolution (930x581, 600x375), not upscaled; at a third of
           the row the card is drawn well under either.

           `w`/`h` still matter — synth2's full is portrait, and without them
           the lightbox fits it to 72vh and renders it NARROWER than the card
           it was opened from. */
        images: [
            {
                card: "/projects/synth1.webp",
                full: "/projects/synth1-full.webp",
                w: 1918,
                h: 797,
                caption:
                    "A scan of a collapse site: every person found is boxed — cyan when confirmed at 50%+ confidence, amber when possible at 30–50%.",
            },
            {
                card: "/projects/synth2.webp",
                full: "/projects/synth2-full.webp",
                w: 640,
                h: 871,
                caption:
                    "The detection summary, then the dispatch report Gemini writes from it: situation, actions, resources.",
            },
        ],
    },
];

/* ═══════════════════════════════════════════════════════
   ProjectCard — Shared card architecture

   All three Experiments use this component.
   Identical structure ensures visual parity:
   - Double-bezel hero image (16:10 aspect)
   - Click-to-lightbox with gallery navigation
   - Compact tag + heading-sm title
   - Body description (unclamped — let content breathe)
   - Highlight list with gold dash markers
   - Compact-link CTAs (GitHub + optional Live Demo)

   The stagger index controls entrance animation delay
   so the cards reveal in sequence, left to right where
   they share a row.
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
       two more states to style and reason about for no gain in a gallery
       of six shots at most. */
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
        /* Flex classes only on this wrapper — never a transform. The Lightbox
           below renders in place rather than through a portal, and any
           transformed ancestor would become the containing block for its
           `fixed` overlay. That is also why it sits outside both Reveals,
           which ship an inline transform as their start state. */
        <div
            className="flex flex-col max-w-2xl lg:max-w-none lg:flex-row lg:gap-8
                       xl:flex-col xl:gap-0"
        >
            {/* Hero image in double-bezel */}
            <Reveal
                y={28}
                duration={0.8}
                delay={0.06 + baseDelay}
                className="shrink-0 lg:w-[55%] xl:w-auto"
            >
                <div className="shell-bezel compact-bezel">
                    <div className="core-bezel overflow-hidden">
                        {/* A <button>, not a <div onClick>. This was the ONLY
                            control on the site that could not be reached from a
                            keyboard — every other expand affordance
                            (CaseStudyStage, LudexShowcase, FigureGallery) is
                            already a real button.

                            The UA button styles are reset inline so this renders
                            byte-identically to the div it replaces: no
                            appearance, no border, no padding, no font
                            inheritance break, and `text-align: inherit` because
                            a button centres its content by default. */}
                        <button
                            type="button"
                            data-cursor="zoom"
                            aria-label={`Enlarge ${project.title} screenshot`}
                            className="relative block w-full aspect-[16/10] cursor-pointer group/card-img
                                       appearance-none bg-transparent border-0 p-0 m-0
                                       font-inherit text-left"
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
                                /* Stacked below 1024 (capped at 42rem), 55% of
                                   a row to 1279, a third of a capped 1072px
                                   column above. A bare `30vw` would fetch a
                                   576px image at 1920 for a 331px slot. */
                                sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 45vw, 340px"
                                /* `priority` is deprecated as of Next 16 in
                                   favour of `preload`, which says what it
                                   actually does.

                                   Tied to the FIRST shot as well as the first
                                   card: preloading is an LCP measure, and once
                                   the reader has paged away this is no longer
                                   the image that paints on arrival. */
                                preload={staggerIndex === 0 && current === 0}
                            />
                        </button>
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

            {/* Content. A flex column that takes the rest of the card, so the
                link row below can sit on the card's bottom edge. `min-w-0`
                because in the 1024-1279 row it is a flex item beside the
                image, and a flex item will not shrink below its longest word. */}
            <Reveal
                y={14}
                delay={0.16 + baseDelay}
                className="mt-7 lg:mt-0 xl:mt-7 flex flex-1 min-w-0 flex-col"
            >
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

                {/* CTA links. `mt-auto` is what puts the three link rows on
                    one line when the cards share a row; `pt-7` is the spacing
                    that used to be `mt-7`, kept as the minimum. */}
                <div className="mt-auto pt-7 flex gap-4 items-center">
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
   Main Section — three matched cards
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

            {/* One column until xl, three across from there — see the header.
                `items-stretch` is what gives every card in a row the same
                height for the link rows to align against. */}
            <div className="section-container">
                <div className="mt-12 md:mt-16 grid grid-cols-1 xl:grid-cols-3 gap-14 xl:gap-10 items-stretch">
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
