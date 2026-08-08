"use client";

import Reveal from "@/components/Reveal";
import LudexShowcase from "@/components/LudexShowcase";
import DoubleUNetShowcase from "@/components/DoubleUNetShowcase";

/* ══════════════════════════════════════════════════════
   FeaturedWork

   Owns the #work section and holds the deep case studies.
   Each project is a self-contained <article> block with
   its own layout — deliberately not a shared template,
   because the projects differ in what they have to show:
   Ludex has 16:9 product video (sticky split), the Double
   U-Net has 6.8:1 architecture figures (full-width band).

   #work stays a single section id, so the LivingArchitecture
   stage contract, SideNav and the command palette need no
   changes — all three resolve getElementById("work").
   ══════════════════════════════════════════════════════ */

export default function FeaturedWork() {
    return (
        <section id="work" className="relative section-y section-divide">
            {/* Subtle accent radial glow — visual differentiation
                within the dark theme, not a theme switch */}
            <div className="ludex-glow" aria-hidden="true" />

            <div className="section-container">
                <Reveal>
                    <p className="label">02 / Featured Work</p>
                </Reveal>
            </div>

            <div className="mt-10 md:mt-14">
                <LudexShowcase />
            </div>

            {/* Divider between case studies — the section already has one at
                its top, so this is the only internal rule. */}
            <div className="section-container">
                <div className="mt-24 md:mt-36 border-t border-edge" />
            </div>

            <div className="mt-24 md:mt-32">
                <DoubleUNetShowcase />
            </div>
        </section>
    );
}
