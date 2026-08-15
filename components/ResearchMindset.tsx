"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import Reveal from "@/components/Reveal";
import { gsap, ScrollTrigger } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   Approach — What I Build

   Replaces a generic Research/Experiment/Measure/Iterate
   pillar list. Every capability here names the project
   that proves it, so the section says something only this
   portfolio can say.

   Keeps id="research" — the atlas and SideNav index
   against it.

   ── The one animated outline on the site ──
   The four cards carry a light source travelling around a
   1px ring, quiet on all four and much brighter under the
   cursor. All of it is CSS (`.capability-card` in
   globals.css); the only job here is to say WHEN it may run.

   A conic gradient repaints its whole element every frame,
   so four of them running for the entire session — next to
   the atlas canvas, which is already drawing — is precisely
   the cost this repo sheds everywhere else. One
   ScrollTrigger toggles `.ring-live` while the section is on
   screen and the CSS keeps the animation paused otherwise.

   ScrollTrigger from lib/motion, not gsap/ScrollTrigger:
   that module is where registerGsap() registers it, and an
   unregistered plugin fails silently.
   ══════════════════════════════════════════════════════ */

/* Every entry names the project that proves it. That constraint is the
   section's whole point, so entry 04's old evidence — "Currently exploring" —
   was the one thing it could not say. It has been replaced with the ISRO
   work, which is both real and the strongest item on the site. */
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
        evidence: "PlayNexus · multi-region pipeline  ·  SynthRescue · YOLO triage",
    },
];

export default function ResearchMindset() {
    const section = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            const el = section.current;
            if (!el) return;

            const mm = gsap.matchMedia();

            /* Gated on reduced-motion here as well as in CSS. The CSS branch
               stops the sweep; this stops the trigger from existing at all,
               so a reader who never wants motion also never pays for a
               scroll listener that only ever enables one. */
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const st = ScrollTrigger.create({
                    trigger: el,
                    /* The full crossing, both edges: running from the moment
                       any part of the section enters the viewport until the
                       last of it leaves. A tighter window would have the
                       rings visibly start moving partway down the section. */
                    start: "top bottom",
                    end: "bottom top",
                    toggleClass: { targets: el, className: "ring-live" },
                });
                return () => st.kill();
            });

            return () => mm.revert();
        },
        { scope: section },
    );

    return (
        <section
            ref={section}
            id="research"
            className="section-y section-divide"
        >
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
                    ring, drawn by `.capability-card` in globals.css.

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
                            className="group capability-card
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
                            <p className="label-muted mt-5 normal-case tracking-normal text-xs">
                                {item.evidence}
                            </p>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
