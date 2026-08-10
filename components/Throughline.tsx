"use client";

import Reveal from "@/components/Reveal";
import { CASE_STUDIES } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   The Through-Line

   Sits between #intro and #work. Two jobs:

   1. Editorial — say what actually connects the three case
      studies, which is that none of the numbers is stated
      alone. That is the claim the whole site rests on, and
      nothing else on the page makes it explicitly.

   2. Structural — it is the runway into the immersive
      case-study zone. Entering that mode straight off the
      hero would read as a glitch; entering it after a
      deliberate, quiet section reads as arrival.

   id="throughline" is index 1 in SECTION_IDS, so the atlas
   draws STAGES[1] here. Adding or moving this section means
   moving that stage with it.

   Metrics come from CASE_STUDIES — this section must never
   restate a number that lives somewhere else.
   ══════════════════════════════════════════════════════ */

export default function Throughline() {
    return (
        <section id="throughline" className="section-y section-divide">
            <div className="section-container">
                <Reveal y={16}>
                    <p className="label">02 / The Through-Line</p>
                </Reveal>

                <Reveal y={24} delay={0.08}>
                    <h2 className="heading-xl mt-6 max-w-[16ch]">
                        Measured against something that already existed.
                    </h2>
                </Reveal>

                <Reveal y={20} delay={0.16}>
                    <p className="body-lg mt-10 measure">
                        A number with nothing to compare it to is not a result.
                        Each of the three systems below was evaluated against a
                        published benchmark or the approach it replaced, on the
                        same data and the same split — and each one names the
                        case where it falls down rather than leaving it out.
                    </p>
                </Reveal>

                {/* Compact proof rows. Deliberately understated: this is a
                    threshold, not a results section — the zone that follows
                    is where these get their space. */}
                <Reveal
                    stagger={0.07}
                    delay={0.22}
                    className="mt-16 border-t border-edge"
                >
                    {CASE_STUDIES.map((study, i) => (
                        <div
                            key={study.slug}
                            data-reveal-child
                            className="flex flex-wrap items-baseline gap-x-6 gap-y-2
                                       py-5 border-b border-edge"
                        >
                            <span className="mono text-xs text-quaternary tabular-nums shrink-0">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-sm text-primary shrink-0 min-w-[13rem]">
                                {study.title}
                            </span>
                            <span className="mono text-sm text-accent tabular-nums shrink-0">
                                {study.metric}
                            </span>
                            <span className="body-sm text-tertiary">
                                {study.metricLabel}
                            </span>
                        </div>
                    ))}
                </Reveal>

                <Reveal y={14} delay={0.3}>
                    <p className="label-muted mt-10 normal-case tracking-normal">
                        Scroll on — the next three screens belong to them.
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
