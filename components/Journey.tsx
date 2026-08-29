"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import Reveal from "@/components/Reveal";
import { EASE, gsap, registerGsap } from "@/lib/motion";
import { onEntranceReady } from "@/lib/entrance";

/* ══════════════════════════════════════════════════════
   Journey — the path draws itself

   Career beats only. The project descriptions and their
   metrics live in #work and #projects; repeating them here
   would be the third telling of the same three projects.

   ── WHAT THIS REPLACED ──
   Six visually identical rows on a static gradient rail,
   each fading in once from the left, plus a three-column
   block of Education / Currently Exploring / Status that
   restated things the page already said three times over —
   Education and Status are both in the hero's fact column,
   "Currently Exploring" repeated the "What's next" beat
   nearly verbatim, and Contact, the very next section,
   carries "Status: Available".

   Three things were wrong and only one of them was motion:

   • NO FOCAL POINT. The largest thing in the whole section
     was a 21px `heading-sm`, sitting between #stack's
     orbital canvas and Contact's centred terminus.
   • NO GROUPING. The years repeat (2025 twice, 2026 twice)
     and nothing said so, so the "path" never read as time
     passing — just six rows that happened to be in order.
   • NO SCROLL LINK. One-shot reveals in a site where
     everything else is scrubbed.

   Now: four year stations carrying the numerals, ten
   waypoints on a rail that draws itself as you scroll, and
   every beat that names a project links to it.
   ══════════════════════════════════════════════════════ */

/* ── The geometry, and it is ONE constant ──
   At progress p the track's top sits at HEAD*vh - p*H and the
   head sits p*H below it, so the head's viewport Y is EXACTLY
   HEAD*vh across the whole range — at every viewport height and
   every track height. A marker at document offset o therefore
   crosses HEAD*vh at precisely p = o/H, which is why a waypoint
   trigger written HEAD+IGNITE → HEAD-IGNITE is half-complete at
   the instant the head arrives. The trace and the waypoints
   agree by geometry, with no shared timeline and no tuned
   offsets. Verifiable arithmetically without rendering a frame:
   ScrollTrigger's start/end are document pixels computed during
   refresh(), not during rAF. */
const HEAD = 0.55;

/** Half the ignition window, in viewport fractions. */
const IGNITE = 0.1;

/* THE SAME NUMBER ON THE TRACE AND ON EVERY WAYPOINT. A scrub
   value is a lag filter; two different time constants means the
   head reaches a marker measurably before or after it lights.
   Easy to introduce by accident, because `scrub: true` and
   `scrub: 1` both look like they work. */
const SCRUB = 1;

/* ── The recession floor, and it is a CONTRAST number ──
   Measured as a composite over --surface-0, which is the surface
   this section actually lands on:

     --text-primary   #BBE1FA  11.22 → 6.94:1   beat title  (4.5)
     --text-secondary #98B8CD   7.41 → 4.85:1   body + link (4.5)
     --accent-text    #5C9ECA   5.29 → 3.62:1   numeral     (3.0)

   0.70 puts body copy at 4.39 and fails. So this is a floor, not
   a taste value, and lowering it is a WCAG change disguised as a
   motion tweak. If the recession reads as too subtle, the fix is
   more contrast on the DOT — which is decorative, carries nothing
   the text doesn't, and is therefore unbounded — never a lower
   number here. */
const RECESSED = 0.75;

interface Beat {
    title: string;
    description: string;
    link?: { href: string; label: string };
}

interface YearGroup {
    year: string;
    beats: Beat[];
}

const JOURNEY: YearGroup[] = [
    {
        year: "2023",
        beats: [
            {
                title: "Joined IIIT Pune",
                description:
                    "Started B.Tech Computer Science — data structures, algorithms, and how large systems hold together.",
            },
        ],
    },
    {
        year: "2024",
        beats: [
            {
                title: "First platform shipped",
                description:
                    "PlayNexus took me from coursework to production: real APIs, real pipelines, real usage.",
                link: { href: "#projects", label: "PlayNexus in Experiments" },
            },
        ],
    },
    {
        year: "2025",
        beats: [
            {
                title: "Moved into ML systems",
                description:
                    "Ludex was the turn toward research — build a recommender, then measure it honestly.",
                link: {
                    href: "/work/ludex",
                    label: "Read the Ludex case study",
                },
            },
            {
                title: "Applied AI, end to end",
                description:
                    "SynthRescue put computer vision into a full pipeline, from upload to report.",
                link: { href: "#projects", label: "SynthRescue in Experiments" },
            },
        ],
    },
    {
        /* 2026, not 2025. The internship ran June–July 2026; the earlier year
           was wrong and is corrected here. It still sits immediately before
           "What's next", so the timeline stays in ascending order. */
        year: "2026",
        beats: [
            {
                /* NBSP between "at" and "ISRO": at a 320px viewport the title
                   is 265.9px against a 240px box, and the natural break widows
                   "ISRO" on a line of its own. Bound, it breaks earlier and
                   evenly. */
                title: "Research & ML internship at ISRO",
                description:
                    "Cross-view gait recognition at the Liquid Propulsion Systems Centre — 98.00% Rank-1 on CASIA-B, with an honest account of where occlusion breaks it.",
                link: {
                    href: "/work/gait-multi-modal-fusion",
                    label: "Read the Gait case study",
                },
            },
            {
                title: "What's next",
                description:
                    "Exploring RAG, embedding search and code intelligence — tools that make big systems legible.",
            },
        ],
    },
];

/** The marker. Always a child of the element it aligns to — see the `0.5lh`
 *  note in globals.css. */
function Waypoint({ station = false }: { station?: boolean }) {
    return (
        <span
            className={`journey-mark${station ? " journey-mark--year" : ""}`}
            aria-hidden="true"
        >
            <span className="journey-mark-core" />
        </span>
    );
}

/* A hash link is a plain <a> so Lenis (`anchors: true`) intercepts it; a route
   link is next/link. No `data-cursor`: Experience.tsx's link to a case study
   carries none, and "READ CASE STUDY" over a `#projects` link would promise a
   destination that does not exist.

   `.compact-link`, NOT `.compact-link--accent`. The accent is already spent on
   the year numeral in the same row, and --accent-text at 14px measures 3.62:1
   at the recession floor, which fails AA for body-scale text. `.compact-link`'s
   own --text-secondary holds 4.85:1 there. */
function BeatLink({ href, label }: { href: string; label: string }) {
    const inner = (
        <>
            {label}
            <span aria-hidden="true">→</span>
        </>
    );
    return href.startsWith("#") ? (
        <a href={href} className="compact-link mt-4">
            {inner}
        </a>
    ) : (
        <Link href={href} className="compact-link mt-4">
            {inner}
        </Link>
    );
}

export default function Journey() {
    const trackRef = useRef<HTMLDivElement>(null);
    const traceRef = useRef<HTMLSpanElement>(null);

    /* Idempotent, and required: Reveal imports gsap from lib/motion but never
       registers, so it relies on components like this one having done it. Miss
       the CustomEase registration and every `ease: EASE` on the site silently
       falls back to GSAP's default with no error. */
    registerGsap();

    useGSAP(
        () => {
            const track = trackRef.current;
            const trace = traceRef.current;
            if (!track || !trace) return;

            const mm = gsap.matchMedia();

            const unsubscribe = onEntranceReady(() => {
                /* No `(scripting: enabled)` clause, deliberately. CaseStudyZone
                   carries one because its query must match a CSS @media block
                   that stages a layout the JS then animates. Nothing here is
                   staged in CSS — the CSS default IS the finished state and
                   this effect is purely subtractive — so there is no second
                   copy to keep in step.

                   And no paired `(prefers-reduced-motion: reduce)` block, which
                   is also not an omission. Every other motion component pairs
                   the two because it has a server-rendered start state to undo.
                   Here a reduce branch would `set` values the elements already
                   have. */
                mm.add("(prefers-reduced-motion: no-preference)", () => {
                    /* The trace. `ease: "none"` IS THE INVARIANT, not a
                       default — the head is pinned to HEAD only because length
                       is linear in progress. EASE peaks near twice its own
                       average slope, so the head would run tens of vh ahead of
                       the reader mid-window and fall back, and every waypoint
                       would then ignite at a moment the head is somewhere
                       else. Nothing errors; it just reads as a pacing problem,
                       and HEAD is the last thing anyone would suspect. */
                    const traceTween = gsap.fromTo(
                        trace,
                        { scaleY: 0, transformOrigin: "50% 0%" },
                        {
                            scaleY: 1,
                            ease: "none",
                            scrollTrigger: {
                                trigger: track,
                                start: `top ${HEAD * 100}%`,
                                end: `bottom ${HEAD * 100}%`,
                                scrub: SCRUB,
                                invalidateOnRefresh: true,
                            },
                        },
                    );

                    /* Per-waypoint triggers rather than one master timeline,
                       and the reason is the opposite of CaseStudyZone's. Its
                       three acts are stacked absolutely in a sticky box and
                       have no document position, so the clock must be the
                       authority. These rows are in normal flow at real
                       offsets: per-entry triggers re-measure themselves on
                       every ScrollTrigger.refresh() for free, whereas a master
                       timeline would need positions computed from
                       offsetTop/trackHeight — and timeline POSITIONS cannot be
                       function-based, only tween values can, so every resize
                       that rewrapped a title would leave them stale.

                       Nothing is `once:` and nothing is one-directional, so
                       scrolling back up retracts the trace and un-ignites the
                       waypoints symmetrically. No state is written outside the
                       tweens, so nothing can be stranded. */
                    const rows = gsap.utils.toArray<HTMLElement>(
                        "[data-journey-row]",
                        track,
                    );

                    const ignitions = rows.map((row) => {
                        const core = row.querySelector(".journey-mark-core");
                        const mark = row.querySelector(".journey-mark");
                        const tl = gsap.timeline({
                            scrollTrigger: {
                                trigger: mark ?? row,
                                start: `top ${(HEAD + IGNITE) * 100}%`,
                                end: `top ${(HEAD - IGNITE) * 100}%`,
                                scrub: SCRUB,
                            },
                        });

                        /* Both at position 0, duration 1, so each spans the
                           whole scrubbed window. EASE is right here — these are
                           short local transitions, not the length mapping. */
                        if (core) {
                            tl.fromTo(
                                core,
                                { opacity: 0, scale: 0.3 },
                                {
                                    opacity: 1,
                                    scale: 1,
                                    duration: 1,
                                    ease: EASE,
                                },
                                0,
                            );
                        }
                        tl.fromTo(
                            row,
                            { opacity: RECESSED },
                            { opacity: 1, duration: 1, ease: EASE },
                            0,
                        );

                        return tl;
                    });

                    return () => {
                        traceTween.scrollTrigger?.kill();
                        traceTween.kill();
                        ignitions.forEach((tl) => {
                            tl.scrollTrigger?.kill();
                            tl.kill();
                        });
                    };
                });
            });

            return () => {
                unsubscribe();
                mm.revert();
            };
        },
        { scope: trackRef },
    );

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

                {/* `mt-14` matches ResearchMindset, the other list-of-items
                    section. It was `mt-16` twice — here and above the status
                    grid — which CLAUDE.md names as one of the two sections
                    stacking another 96–128px on top of `--space-section`. One
                    of those went with the grid; this one came down a rung.

                    NOT on `.section-container`: that sets `margin: 0 auto` and
                    is declared after Tailwind's utilities, so an `mt-*` there
                    computes to 0px. */}
                <div ref={trackRef} className="journey-track mt-14">
                    {/* Siblings of the <ol>, not children — an <ol> permits
                        only <li>, <script> and <template>. */}
                    <span className="journey-rail" aria-hidden="true" />
                    <span
                        ref={traceRef}
                        className="journey-trace"
                        aria-hidden="true"
                    />

                    {/* The heading outline is unchanged from the old version —
                        <h2> Journey, then one <h3> per beat — so this redesign
                        is invisible to a screen-reader rotor. The year is a
                        <p>/<time> and not a heading, because it introduces no
                        prose: it is the list's grouping key. */}
                    <ol className="journey-groups">
                        {JOURNEY.map((group) => (
                            <li key={group.year} className="journey-group">
                                <p
                                    className="journey-year metric-card"
                                    data-journey-row
                                >
                                    <Waypoint station />
                                    <time dateTime={group.year}>
                                        {group.year}
                                    </time>
                                </p>

                                <ol className="journey-beats">
                                    {group.beats.map((beat) => (
                                        <li
                                            key={beat.title}
                                            className="journey-beat"
                                            data-journey-row
                                        >
                                            <h3 className="heading-sm journey-beat-title">
                                                <Waypoint />
                                                {beat.title}
                                            </h3>
                                            <p className="body-sm mt-3 measure-tight">
                                                {beat.description}
                                            </p>
                                            {beat.link && (
                                                <BeatLink {...beat.link} />
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}
