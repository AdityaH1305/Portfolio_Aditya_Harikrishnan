"use client";

import { Fragment } from "react";
import Reveal from "@/components/Reveal";

/* ══════════════════════════════════════════════════════
   Approach — What I Build

   Replaces a generic Research/Experiment/Measure/Iterate
   pillar list. Every capability here names the project
   that proves it, so the section says something only this
   portfolio can say.

   Keeps id="research" — the atlas and SideNav index
   against it.

   ── The animated outline ──
   The four cards carry a light source travelling around a
   1px ring, quiet on all four and much brighter under the
   cursor. All of it is CSS — `.live-ring` in globals.css,
   the same ring every media mat on the site now wears — and
   `components/LiveRings.tsx` is the single observer that
   decides when any of them may run. Nothing about it lives
   here beyond the class name.
   ══════════════════════════════════════════════════════ */

/* Every entry names the project that proves it. That constraint is the
   section's whole point, so entry 04's old evidence — "Currently exploring" —
   was the one thing it could not say. It has been replaced with the ISRO
   work, which is both real and the strongest item on the site. */

/** Separates two projects inside one evidence line; a single ` · ` separates
 *  facts about the same project. Only the first is a place the line may wrap. */
const EVIDENCE_GAP = "  ·  ";

const capabilities = [
    {
        number: "01",
        title: "Biometric Recognition",
        description:
            "Recognition that holds up when the camera angle changes or frames go missing.",
        evidence: "Gait Fusion · ISRO / LPSC · 98.00% Rank-1 on CASIA-B",
    },
    {
        number: "02",
        title: "Medical Image Segmentation",
        description:
            "Medical scans outlined automatically, extended past the published baseline.",
        evidence: "Modified Double U-Net · 95.94% mean IoU · ternary extension",
    },
    {
        number: "03",
        title: "Recommendation Systems",
        description:
            "Two recommendation methods blended so each covers the other's blind spot.",
        evidence: "Ludex · TF-IDF + implicit ALS · +27% Precision@20",
    },
    {
        number: "04",
        title: "Data-Driven Platforms",
        description:
            "Live APIs, analytics pipelines and custom scoring, with vision in the loop.",
        /* Three projects, so the tails are short: at the widest card (488px of
           12px mono with label tracking, ~8.9px a character) the first two
           share a line with ~35px spare and SynthRescue takes the second.
           "Verdict · calibrated recovery agent" alone measured 311px, which
           left every project on a line of its own. */
        evidence:
            "Verdict · recovery agent  ·  PlayNexus · live pricing  ·  SynthRescue · YOLO triage",
    },
];

export default function ResearchMindset() {
    return (
        <section id="research" className="section-y section-divide">
            <div className="section-container">
                {/* ── Header — headline left, lead right ── */}
                <Reveal y={16} className="section-head">
                    <div>
                        <p className="label">Approach</p>
                        <h2 className="heading-lg mt-3">What I Build</h2>
                    </div>
                    <p className="body-lg measure-tight">
                        Systems that combine software engineering with machine
                        learning — each one shipped, measured, and running.
                    </p>
                </Reveal>

                {/* ── Capabilities ──
                    Was a `gap-px bg-edge` grid: four cells on a hairline
                    lattice, which is a table pretending to be a layout. The
                    lattice went; what each card has now is its own travelling
                    ring, drawn by `.live-ring` in globals.css.

                    THE COLUMN GAP HAD TO GROW, and by a specific amount. The
                    cards bleed past the text column with `-mx-6 lg:-mx-8` so
                    the hover background reaches beyond the copy — invisible
                    while nothing was drawn at those edges, and fatal once
                    something is. At lg the bleed is 32px a side, so two
                    neighbours eat 64px, which is exactly what `gap-x-16` was:
                    the rings would have met with no space between them.

                    gap-x-20 / lg:gap-x-24 leaves 32px of real gap at both
                    breakpoints (80 − 24 − 24, and 96 − 32 − 32). gap-y-6
                    because rows have no negative margin to absorb. */}
                <Reveal
                    stagger={0.08}
                    className="mt-14 grid md:grid-cols-2 gap-x-20 gap-y-6 lg:gap-x-24"
                >
                    {capabilities.map((item) => (
                        <div
                            key={item.title}
                            data-reveal-child
                            className="group capability-card live-ring
                                       py-8 lg:py-10 px-6 lg:px-8 -mx-6 lg:-mx-8
                                       transition-colors duration-300
                                       hover:bg-surface-1"
                        >
                            <span
                                className="mono text-xs text-tertiary
                                           group-hover:text-accent
                                           transition-colors duration-300"
                            >
                                {item.number}
                            </span>
                            <h3
                                className="heading-sm mt-3
                                           group-hover:text-accent
                                           transition-colors duration-300"
                            >
                                {item.title}
                            </h3>
                            <p className="body-sm mt-3">{item.description}</p>
                            {/* With more than one project, one nowrap span each,
                                so the line can only break BETWEEN projects. 04
                                names three, and as one string it broke inside
                                "16-|region" — a hyphen is a break opportunity
                                like a space. A single project stays plain text:
                                02 is one project on two lines, and nowrap would
                                push it out of its card. */}
                            <p className="label-muted mt-5 normal-case tracking-normal text-xs">
                                {item.evidence.includes(EVIDENCE_GAP)
                                    ? item.evidence.split(EVIDENCE_GAP).map((part, i) => (
                                          <Fragment key={part}>
                                              {i > 0 && EVIDENCE_GAP}
                                              <span className="whitespace-nowrap">{part}</span>
                                          </Fragment>
                                      ))
                                    : item.evidence}
                            </p>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
