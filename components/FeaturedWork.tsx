"use client";

import dynamic from "next/dynamic";

import Reveal from "@/components/Reveal";
import CaseStudyZone from "@/components/CaseStudyZone";

/* The title, built out of the atlas. `ssr: false` like the other two canvases
   — it is decoration over a heading that is already in the HTML. */
const ZoneTitle = dynamic(() => import("@/components/ZoneTitle/ZoneTitle"), {
    ssr: false,
});

/* ══════════════════════════════════════════════════════
   FeaturedWork — the case-study index

   Was three full case studies inline, ~1,300 lines in one
   scroll. They now live at /work/<slug>, and this is the
   index that sends readers there.

   #work stays a single section id: the LivingArchitecture
   stage contract, SideNav and the command palette all
   resolve getElementById("work"), so keeping the id means
   none of them need to know this changed at all.

   The flat card list is gone — CaseStudyZone renders the
   three as an immersive sequence instead. This component is
   now just the section shell and its header.
   ══════════════════════════════════════════════════════ */

export default function FeaturedWork() {
    return (
        <section id="work" className="relative section-y section-divide">
            <div className="section-container">
                {/* ── ONE COLUMN, NOT TWO, AND ONLY HERE ──
                    Every other section puts its headline left and its lead
                    right in a `.section-head` grid, asymmetric on purpose so
                    the two edges do not line up into a second implied centre.

                    This section keeps the asymmetry and changes what is on
                    the right: the atlas. `.section-head`'s grid spans the
                    full measure, which crosses the diagram's band at 1440 —
                    the same reason the acts below moved into the left band.
                    The right column is now the thing the section is about,
                    which is a better version of the same idea rather than an
                    exception to it. */}
                <Reveal className="work-head">
                    {/* "Projects", not "Case Studies". The ids are untouched —
                        #work still resolves for the atlas, the nav rail and
                        the palette — but the phrase a reader sees is the one
                        they use themselves. */}
                    <p className="label">Selected Work</p>

                    {/* THE HEADING STAYS IN THE DOM AND STAYS THE HEADING.
                        Where the canvas can actually render, CSS hides it
                        visually and `ZoneTitle` draws the same word out of
                        the atlas's own cubes; everywhere else — no JS, a
                        narrow screen, reduced motion — this is simply the
                        section title, styled as usual. Same arrangement
                        SkillOrbit uses for its skill list: the DOM is the
                        accessible interface and the canvas is decoration.

                        `data-zone-title` is the anchor the canvas measures
                        each frame, which is why the element must keep its
                        box rather than being `display: none`. */}
                    {/* ── THE CUBE WORD'S BOX IS ALL INK, AND TYPE'S IS NOT ──
                        `ZoneTitle` gives this element the drawn word's exact height,
                        so the margins here are honest — but honest is not the same
                        as matching. A `heading-lg` renders 38px caps inside a 42.6px
                        line box, so roughly 7.6px of optical air sits above and below
                        the letterforms for free. The cube word fills its box edge to
                        edge: zero air, hard silhouettes.

                        So the site's usual `mt-3` between an eyebrow and a headline
                        reads as ~20px of optical gap for text and exactly 12px here.
                        `mt-5` puts this back on the site's optical rhythm rather than
                        its numeric one — the same apparent distance, arrived at by
                        paying for the air the type would have brought with it. */}
                    <h2 className="heading-lg mt-5 work-head-title" data-zone-title>
                        Projects
                    </h2>

                    {/* And a clear break out of it. The eyebrow belongs to the title —
                        it is a label for it — while the lead is a separate thought,
                        so these two gaps should not be equal. 36px is a little over
                        half the word's own height, which is the proportion that reads
                        as deliberate rather than as leftover space. 40 against 20
                        is a clean 1:2, and both are now measured against the word's
                        real ink box rather than the span between cube centres — the
                        earlier version was 12px short in each axis, so every gap
                        here was 6px tighter than it read. */}
                    <p className="body-lg measure-tight mt-10">
                        Three systems built end to end — each one measured
                        against a real baseline and written up with its limits
                        intact.
                    </p>
                </Reveal>
            </div>

            <ZoneTitle />

            {/* The immersive sequence replaces the card list. Each panel
                still links to its /work/* route, so this is an index with a
                different presentation — not a duplicate of the case studies.
                Outside .section-container because the Double U-Net panel
                bleeds its architecture diagram to the viewport edge. */}
            {/* Wider than it was: the header now ends in a display-scale cube
                wordmark rather than a 38px line of type, and the zone below it is a
                full-bleed sticky region. 80px between the two read as a seam. */}
            <div className="mt-14 md:mt-24">
                <CaseStudyZone />
            </div>
        </section>
    );
}
