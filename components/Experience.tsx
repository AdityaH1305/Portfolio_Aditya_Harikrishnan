"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";

/* ══════════════════════════════════════════════════════
   Experience

   The ISRO/LPSC internship was mentioned three times before this and given a
   home by none of them: two lines in the hero's fact column, one row in the
   Journey timeline near the bottom of the page, and an `evidence` string on a
   capability card. None of those reads as EXPERIENCE — a role, at an
   organisation, over a period — which for most readers of a portfolio is the
   first thing they look for.

   It sits between the hero and `#research` and leads into "What I Build",
   which is why its bottom padding is deliberately light: `.section-y` on
   `#research` supplies the gap below, and this should flow into that section
   rather than stand apart from it.

   ── DELIBERATELY NOT A SECTION ID ──
   `SECTION_IDS` in LivingArchitecture/stages.ts, `sections` in SideNav.tsx
   and `NAV` in CommandPalette.tsx are index-aligned, and the atlas draws
   `STAGES[i]` for `SECTION_IDS[i]`. An eighth id would mean authoring an
   eighth StageConfig that fits the ascending-intensity ramp `blend.test.ts`
   asserts pairwise, renumbering the rail 01…08, and re-checking
   `GlyphA/glyph.ts`, which reads `STAGES[1]` BY LITERAL INDEX to aim the hero
   glyph's flight — inserting a stage at index 1 silently repoints it.

   None of that buys anything here. This is a plain `<div>` with no id, so
   none of those files ever sees it. The deleted `CredibilityBand` occupied
   this exact slot on the same reasoning.

   `relative z-[1]` is not decoration and must not be dropped: `.zone-tint` is
   a `fixed; z-index: 0` overlay for the case-study room, and a STATIC block
   paints underneath it and gets dimmed along with the page ground. Every
   `<section>` gets `position: relative` from `.section-y` for exactly this
   reason; a non-section block has to supply its own.
   ══════════════════════════════════════════════════════ */

export default function Experience() {
    return (
        <div className="relative z-[1]">
            <div className="section-container">
                {/* The rhythm lives HERE, never on `.section-container` — that
                    sets `margin: 0 auto` and is declared after Tailwind's
                    utilities, so an `mt-*` on the same node computes to 0px.

                    No `stagger`: with it, `Reveal` animates direct children
                    only and the wrapper gets no start state, so every child
                    would need `data-reveal-child`. One card has one child, so
                    the plain form is both correct and simpler. */}
                <Reveal y={16} className="pt-10 md:pt-14 pb-2 md:pb-4">
                    {/* `.capability-card live-ring` — the one ringed TEXT card
                        this design system has, and the exact treatment the
                        four "What I Build" cards use immediately below. That
                        is the point: it reads as an object rather than a
                        paragraph while speaking the language of the section it
                        leads into.

                        NOT `.shell-bezel`, which is reserved for media mats
                        and would frame prose like a screenshot. And no new
                        outline of its own — this design removed card outlines
                        from every text block, and reusing the sanctioned one
                        is what keeps that true.

                        No CSS was added for any of this: `.live-ring` is
                        already in the `:is()` selector in globals.css and in
                        `LiveRings.tsx`'s `RINGED` constant, so the travelling
                        hairline picks this up for free.

                        The negative margin matches the cards below. It is safe
                        here where it needs care there: the collision warning
                        is about rings meeting across a grid gap, and this card
                        has no neighbour. */}
                    <article
                        className="capability-card live-ring
                                   py-8 lg:py-10 px-6 lg:px-8 -mx-6 lg:-mx-8"
                    >
                        <p className="label">Experience</p>

                        {/* The organisation, not the role, is the headline —
                            it is the part a reader is scanning for. Both
                            strings are reused verbatim from elsewhere in the
                            repo rather than restated: the affiliation from
                            `lib/caseStudies.ts` and "Research Intern" from
                            the hero's fact column. */}
                        <h2 className="heading-sm mt-3">
                            ISRO · Liquid Propulsion Systems Centre
                        </h2>

                        <p className="label-muted mt-2">
                            Research Intern · June – July 2026
                        </p>

                        {/* Short on purpose. The gait project has an entire
                            case study and three figures of its own; repeating
                            that here would be the fourth telling of it.

                            The closing sentence is doing real work. The role
                            covered more than this one project and that work
                            cannot be described, so saying nothing would imply
                            the internship WAS the project. "Not publicly
                            disclosable" rather than "classified" — the latter
                            invites questions about what is being hinted at,
                            this states the fact and closes the subject. */}
                        <p className="body-sm mt-5 measure">
                            Built a cross-view gait recognition system on
                            CASIA-B — a set-based silhouette model with a
                            multi-modal fusion branch — reaching 98.00% Rank-1
                            under normal walking. Additional work under the
                            same programme is not publicly disclosable.
                        </p>

                        <Link
                            href="/work/gait-multi-modal-fusion"
                            className="compact-link compact-link--accent mt-5"
                        >
                            Read the case study
                            <span aria-hidden="true">→</span>
                        </Link>
                    </article>
                </Reveal>
            </div>
        </div>
    );
}
