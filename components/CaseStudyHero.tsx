"use client";

import Reveal from "@/components/Reveal";
import { CASE_STUDIES } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   CaseStudyHero

   The cover block for a /work/* route. Each showcase used
   to open with its own eyebrow + <h2> + context line, which
   made sense when all three were stacked inside #work on the
   home page — the page already had an <h1>.

   On their own routes that was wrong twice over: the case
   study is the page, so its title should be the <h1>, and
   the route header bar was already printing the same title
   a few pixels above it.

   The showcases now start at their deck paragraph and this
   owns everything above it.

   Asymmetric on purpose. The title runs full measure, then
   a rule, then a 5/7 split that puts the number on the
   narrow side — the eye lands on the metric before the
   supporting detail, which is the order that matters.
   ══════════════════════════════════════════════════════ */

export default function CaseStudyHero({
    slug,
    /**
     * Heading level for the title.
     *
     * `h1` on a /work/* route, where the case study IS the page. `h2` inside
     * the home-page zone, where the page's h1 is already the site owner's
     * name — three more h1s there gave the page four, which is wrong both
     * semantically and for anyone navigating by headings.
     */
    as: Heading = "h1",
}: {
    slug: string;
    as?: "h1" | "h2";
}) {
    const study = CASE_STUDIES.find((c) => c.slug === slug);
    if (!study) return null;

    return (
        <header>
            <div className="section-container">
                <Reveal stagger={0.08}>
                    <p data-reveal-child className="label-muted">
                        {study.tag}
                    </p>

                    {/* No `.measure` here: ch resolves against the element's
                        own font-size, so 68ch on a 68px heading is ~3000px —
                        the utility silently does nothing. The container's
                        944px is the real cap for display type. */}
                    <Heading data-reveal-child className="heading-xl mt-5">
                        {study.title}
                    </Heading>

                    {study.context && (
                        <p data-reveal-child className="label mt-6">
                            {study.context}
                        </p>
                    )}
                </Reveal>

                {/* Vertical rhythm on the inner element: .section-container
                    sets `margin: 0 auto` and is declared after Tailwind's
                    utilities, so an `mt-*` on it would compute to 0px. */}
                <Reveal y={20} delay={0.15}>
                    <div
                        className="mt-12 md:mt-16 pt-8 border-t border-edge
                                   grid gap-8 md:gap-16
                                   md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                    >
                        <div>
                            <p className="label-muted">Headline result</p>
                            <p className="ludex-hero-metric mt-3">
                                {study.metric}
                            </p>
                            <p className="body-sm mt-2 measure-tight">
                                {study.metricLabel}
                            </p>
                        </div>

                        <div>
                            <p className="label-muted">Stack</p>
                            <p className="mono text-sm text-secondary mt-3 leading-relaxed">
                                {study.stack.join("  ·  ")}
                            </p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </header>
    );
}
