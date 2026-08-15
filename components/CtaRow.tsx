"use client";

import Link from "next/link";
import type { Cta } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   CtaRow — one button layout for every case study

   The three showcases each grew their own ad-hoc button
   row: different gaps, different orders, one with an arrow
   glyph and two without. Same links, three treatments.

   This gives them a single compact, aligned row so they
   read as designed rather than as leftovers. The links
   themselves are unchanged — the primary keeps its arrow,
   the rest sit beside it as secondaries.

   The `Cta` type and the link data both live in
   lib/caseStudies.ts now: the choreographed stage and the
   /work route render the same row, so the data has to sit
   where both can reach it without one importing the other.
   ══════════════════════════════════════════════════════ */

export type { Cta };

export default function CtaRow({
    ctas,
    /** Internal route for the full write-up, shown last and understated. */
    readMoreHref,
}: {
    ctas: Cta[];
    readMoreHref?: string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            {ctas.map((c) => (
                <a
                    key={c.href}
                    href={c.href}
                    className={c.primary ? "btn-primary" : "btn-secondary"}
                    {...(c.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                >
                    {c.label}
                    {c.primary && (
                        <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                        >
                            <path d="M7 17L17 7M17 7H7M17 7v10" />
                        </svg>
                    )}
                </a>
            ))}

            {readMoreHref && (
                <Link
                    href={readMoreHref}
                    data-cursor="read"
                    className="group/more mono text-xs text-tertiary hover:text-accent
                               transition-colors duration-300 inline-flex items-center gap-2 ml-1"
                >
                    Read the full write-up
                    <span
                        aria-hidden="true"
                        className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                                   group-hover/more:translate-x-1"
                    >
                        →
                    </span>
                </Link>
            )}
        </div>
    );
}
