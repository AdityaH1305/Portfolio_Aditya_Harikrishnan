"use client";

import Reveal from "@/components/Reveal";
import CaseStudyZone from "@/components/CaseStudyZone";

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
                <Reveal className="section-head">
                    {/* "Projects", not "Case Studies". The ids are untouched —
                        #work still resolves for the atlas, the nav rail and
                        the palette — but the phrase a reader sees is the one
                        they use themselves. */}
                    <div>
                        <p className="label">Selected Work</p>
                        <h2 className="heading-lg mt-3">Projects</h2>
                    </div>
                    <p className="body-lg measure-tight">
                        Three systems built end to end — each one measured
                        against a real baseline and written up with its limits
                        intact.
                    </p>
                </Reveal>
            </div>

            {/* The immersive sequence replaces the card list. Each panel
                still links to its /work/* route, so this is an index with a
                different presentation — not a duplicate of the case studies.
                Outside .section-container because the Double U-Net panel
                bleeds its architecture diagram to the viewport edge. */}
            <div className="mt-14 md:mt-20">
                <CaseStudyZone />
            </div>
        </section>
    );
}
