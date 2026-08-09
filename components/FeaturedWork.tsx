"use client";

import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { CASE_STUDIES, type CaseStudy } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   FeaturedWork — the case-study index

   Was three full case studies inline, ~1,300 lines in one
   scroll. They now live at /work/<slug>, and this is the
   index that sends readers there.

   #work stays a single section id: the LivingArchitecture
   stage contract, SideNav and the command palette all
   resolve getElementById("work"), so keeping the id means
   none of them need to know this changed at all.

   Cards are `items-start` in a flex column rather than a
   fixed-height grid, so the metric row lines up across all
   three without forcing equal card heights.
   ══════════════════════════════════════════════════════ */

function CaseStudyCard({ study, index }: { study: CaseStudy; index: number }) {
    return (
        <Link
            href={`/work/${study.slug}`}
            data-cursor="read"
            className="group/card block relative py-10 md:py-14
                       border-t border-edge
                       transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        >
            <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-8 lg:gap-16 items-center">
                {/* ── Text column ── */}
                <div>
                    <div className="flex items-center gap-4">
                        <span className="mono text-xs text-quaternary tabular-nums">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="label-muted">{study.tag}</span>
                    </div>

                    <h3
                        className="heading-lg mt-4 transition-colors duration-300
                                   group-hover/card:text-accent"
                    >
                        {study.title}
                    </h3>

                    {study.context && (
                        <p className="label mt-3">{study.context}</p>
                    )}

                    <p className="body-sm mt-5 measure">{study.thesis}</p>

                    {/* Headline metric — the reason to click. */}
                    <div className="mt-7 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <span className="metric-card">{study.metric}</span>
                        <span className="body-sm text-secondary">
                            {study.metricLabel}
                        </span>
                    </div>

                    <p className="mono text-xs text-tertiary mt-6">
                        {study.stack.join("  ·  ")}
                    </p>

                    <span
                        className="mono text-xs text-secondary mt-8 inline-flex items-center gap-2
                                   group-hover/card:text-accent transition-colors duration-300"
                    >
                        Read case study
                        <span
                            aria-hidden="true"
                            className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                                       group-hover/card:translate-x-1"
                        >
                            →
                        </span>
                    </span>
                </div>

                {/* ── Cover ──
                    A fixed 16:10 frame with object-contain, not the figure's
                    own aspect: these three covers run from 3:1 to 6.8:1, and
                    letting each set its own height made the row of cards
                    ragged. */}
                <div className="shell-bezel order-first lg:order-none">
                    <div className="core-bezel overflow-hidden">
                        <div className="relative aspect-[16/10] p-3">
                            <Image
                                src={study.cover.src}
                                alt={study.cover.alt}
                                fill
                                sizes="(max-width: 1024px) 100vw, 40vw"
                                className="object-contain p-3
                                           transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                                           group-hover/card:scale-[1.02]"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function FeaturedWork() {
    return (
        <section id="work" className="relative section-y section-divide">
            <div className="ludex-glow" aria-hidden="true" />

            <div className="section-container">
                <Reveal>
                    <p className="label">02 / Featured Work</p>
                    <h2 className="heading-lg mt-3">Case Studies</h2>
                    <p className="body-lg mt-5 measure-tight">
                        Three systems built end to end — each one measured
                        against a real baseline and written up with its limits
                        intact.
                    </p>
                </Reveal>

                <div className="mt-14 md:mt-20">
                    {CASE_STUDIES.map((study, i) => (
                        <Reveal key={study.slug} y={24} delay={i * 0.06}>
                            <CaseStudyCard study={study} index={i} />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
