"use client";

import Image from "next/image";
import Link from "next/link";
import { CASE_STUDIES, type CaseStudy } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   The three case-study compositions

   One file rather than three, because the panels share the
   eyebrow / metric / CTA primitives below and splitting them
   would mean a fourth file of shared parts.

   Each composition is driven by the SHAPE of that project's
   own media, which is why they cannot be one template:

     Gait        three 64×64 silhouettes + a 3:1 strip
                 → instrument panel, data rail down the left
     Ludex       a single 16:9 product frame
                 → centred cinematic, media dominant
     Double U-Net a 6.8:1 architecture diagram
                 → full-bleed band, text stacked to one side

   Every string and number comes from CASE_STUDIES. A panel
   must never restate a metric — that registry is the one
   place these live.

   `data-zone-el` marks the elements the scrub timeline
   staggers. Panels render identically in the pinned desktop
   sequence and the stacked mobile fallback; only the parent
   positions them.
   ══════════════════════════════════════════════════════ */

const GAIT = CASE_STUDIES[0];
const LUDEX = CASE_STUDIES[1];
const DUN = CASE_STUDIES[2];

const SILHOUETTES = [
    { src: "/gait/normal.png", code: "NM" },
    { src: "/gait/coat.png", code: "CL" },
    { src: "/gait/bag.png", code: "BG" },
];

/* ── Shared primitives ─────────────────────────────── */

function Eyebrow({ study, index }: { study: CaseStudy; index: number }) {
    return (
        <div className="flex items-center gap-4" data-zone-el>
            <span className="mono text-xs text-accent tabular-nums">
                {String(index + 1).padStart(2, "0")}
            </span>
            <span className="label-muted">{study.tag}</span>
        </div>
    );
}

function Metric({ study }: { study: CaseStudy }) {
    return (
        <div data-zone-el>
            <p className="metric-card">{study.metric}</p>
            <p className="body-sm mt-2 measure-tight">{study.metricLabel}</p>
        </div>
    );
}

function ReadLink({ study }: { study: CaseStudy }) {
    return (
        <Link
            href={`/work/${study.slug}`}
            data-cursor="read"
            data-zone-el
            className="group/read mono text-xs text-secondary inline-flex items-center gap-2
                       hover:text-accent transition-colors duration-300"
        >
            Read case study
            <span
                aria-hidden="true"
                className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                           group-hover/read:translate-x-1"
            >
                →
            </span>
        </Link>
    );
}

/* ── 01 · Gait — instrument panel ──────────────────── */

export function GaitPanel() {
    return (
        <div className="section-container w-full">
            <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-center">
                {/* Data rail */}
                <div className="flex flex-col gap-6">
                    <Eyebrow study={GAIT} index={0} />
                    <h3 className="heading-lg" data-zone-el>
                        {GAIT.title}
                    </h3>
                    <p className="label" data-zone-el>
                        {GAIT.context}
                    </p>
                    <Metric study={GAIT} />
                    <p className="mono text-xs text-tertiary" data-zone-el>
                        {GAIT.stack.join("  ·  ")}
                    </p>
                    <ReadLink study={GAIT} />
                </div>

                {/* Specimen strip + architecture */}
                <div className="flex flex-col gap-6">
                    <div
                        className="flex items-end gap-5"
                        data-zone-el
                        aria-hidden="true"
                    >
                        {SILHOUETTES.map((s) => (
                            <figure key={s.code} className="flex flex-col gap-2">
                                {/* unoptimized + pixelated: 64×64 IS the model's
                                    input resolution, so smoothing would
                                    misrepresent the data. */}
                                <Image
                                    src={s.src}
                                    alt=""
                                    width={64}
                                    height={64}
                                    unoptimized
                                    className="w-14 h-14 md:w-20 md:h-20 [image-rendering:pixelated]
                                               border border-edge rounded"
                                />
                                <figcaption className="mono text-[0.625rem] text-quaternary text-center">
                                    {s.code}
                                </figcaption>
                            </figure>
                        ))}
                        <p className="mono text-[0.625rem] text-quaternary pb-6">
                            64 × 64 input
                        </p>
                    </div>

                    <div className="shell-bezel" data-zone-el>
                        <div className="core-bezel overflow-hidden p-3">
                            <Image
                                src={GAIT.cover.src}
                                alt={GAIT.cover.alt}
                                width={GAIT.cover.w}
                                height={GAIT.cover.h}
                                sizes="(max-width: 1024px) 100vw, 55vw"
                                className="w-full h-auto rounded"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── 02 · Ludex — centred cinematic ────────────────── */

export function LudexPanel() {
    return (
        <div className="section-container w-full">
            <div className="flex flex-col items-center text-center gap-7">
                <Eyebrow study={LUDEX} index={1} />

                <h3 className="heading-lg" data-zone-el>
                    {LUDEX.title}
                </h3>

                {/* The media is the subject here — text is caption weight
                    above and below it. */}
                <div
                    className="shell-bezel w-full max-w-4xl"
                    data-zone-el
                >
                    <div className="core-bezel overflow-hidden">
                        <Image
                            src={LUDEX.cover.src}
                            alt={LUDEX.cover.alt}
                            width={LUDEX.cover.w}
                            height={LUDEX.cover.h}
                            sizes="(max-width: 1024px) 100vw, 60vw"
                            className="w-full h-auto block"
                        />
                    </div>
                </div>

                <div
                    className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2"
                    data-zone-el
                >
                    <span className="metric-card">{LUDEX.metric}</span>
                    <span className="body-sm text-secondary">
                        {LUDEX.metricLabel}
                    </span>
                </div>

                <p className="mono text-xs text-tertiary" data-zone-el>
                    {LUDEX.stack.join("  ·  ")}
                </p>

                <ReadLink study={LUDEX} />
            </div>
        </div>
    );
}

/* ── 03 · Double U-Net — full-bleed band ───────────── */

export function DoubleUNetPanel() {
    return (
        <div className="w-full flex flex-col gap-10">
            {/* The 6.8:1 diagram runs edge to edge — outside
                .section-container on purpose. Its extreme aspect is the
                composition rather than a problem to cap.

                overflow-x-auto, not hidden: at 900px minimum the diagram is
                wider than a phone, and clipping it left the right 60%
                unreachable. On desktop w-full already fits, so no scrollbar
                appears there. data-lenis-prevent because any inner scroller
                has to opt out of Lenis or the page moves instead. */}
            <div
                className="w-full overflow-x-auto"
                data-lenis-prevent=""
                data-zone-el
            >
                <Image
                    src={DUN.cover.src}
                    alt={DUN.cover.alt}
                    width={DUN.cover.w}
                    height={DUN.cover.h}
                    sizes="100vw"
                    className="w-full h-auto block min-w-[900px]"
                />
            </div>

            <div className="section-container">
                <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] gap-8 lg:gap-16 items-end">
                    <div className="flex flex-col gap-5">
                        <Eyebrow study={DUN} index={2} />
                        <h3 className="heading-lg" data-zone-el>
                            {DUN.title}
                        </h3>
                        <p className="body-sm measure" data-zone-el>
                            {DUN.thesis}
                        </p>
                    </div>

                    <div className="flex flex-col gap-5 lg:items-end">
                        <Metric study={DUN} />
                        <p className="mono text-xs text-tertiary" data-zone-el>
                            {DUN.stack.join("  ·  ")}
                        </p>
                        <ReadLink study={DUN} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export const ZONE_PANELS = [GaitPanel, LudexPanel, DoubleUNetPanel];
