"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { CASE_STUDIES } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   CredibilityBand

   The scannable layer. Everything below this point rewards
   a reader who scrolls; this rewards one who doesn't — three
   measured numbers and where they came from, above the fold
   on most laptops.

   Numbers come from CASE_STUDIES rather than being retyped,
   so the band can never disagree with the case study it
   links to.

   Deliberately not a section id: the seven-id contract that
   SECTION_IDS, SideNav and the palette index against stays
   exactly seven. This belongs to the intro.
   ══════════════════════════════════════════════════════ */

export default function CredibilityBand() {
    return (
        <div className="relative z-[1] border-t border-edge">
            <div className="section-container">
                <Reveal stagger={0.07} className="py-10 md:py-12">
                    <p data-reveal-child className="label-muted">
                        Measured results · each links to its case study
                    </p>

                    <div
                        data-reveal-child
                        className="mt-7 grid sm:grid-cols-3 gap-8 sm:gap-6"
                    >
                        {CASE_STUDIES.map((study) => (
                            <Link
                                key={study.slug}
                                href={`/work/${study.slug}`}
                                className="group/stat block"
                            >
                                <p
                                    className="mono text-3xl md:text-4xl font-medium tracking-tight
                                               text-primary transition-colors duration-300
                                               group-hover/stat:text-accent"
                                >
                                    {study.metric}
                                </p>
                                <p className="body-sm mt-2 max-w-[16rem]">
                                    {study.metricLabel}
                                </p>
                                <p className="label-muted mt-3">
                                    {study.context ?? study.title}
                                </p>
                            </Link>
                        ))}
                    </div>
                </Reveal>
            </div>
        </div>
    );
}
