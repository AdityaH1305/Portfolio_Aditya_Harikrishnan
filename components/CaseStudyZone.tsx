"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import CaseStudyHero from "@/components/CaseStudyHero";
import GaitShowcase from "@/components/GaitShowcase";
import LudexShowcase from "@/components/LudexShowcase";
import DoubleUNetShowcase from "@/components/DoubleUNetShowcase";

/* ══════════════════════════════════════════════════════
   CaseStudyZone — the immersive region

   Three chapters, each a pinned title card that releases
   into the COMPLETE case study. Not summaries: the gait
   galleries, the pipeline canvas, the Ludex videos and the
   Double U-Net comparison table all live here now, so there
   is nothing to click through to.

   ── Why the pinned-panel version had to go ──
   The previous build put one summary panel per case study
   inside a single sticky 100vh stage. A full case study is
   several viewport-heights, so it cannot fit in one — the
   architecture only ever worked for teasers.

   ── One source, two places ──
   Each chapter is `CaseStudyHero` + the showcase, which is
   exactly what /work/<slug>/page.tsx renders. Same two
   components in the same order; the only difference here is
   that the header pins. Nothing is duplicated, so the routes
   and the home page cannot drift apart.

   ── Pin gating lives in CSS ──
   `.zone-pin` / `.zone-pin-stage` are inert until the same
   media query that guards the matchMedia below. Keeping the
   breakpoint in one place is what stops the CSS and the JS
   disagreeing about whether anything is pinned.
   ══════════════════════════════════════════════════════ */

const CHAPTERS = [
    { slug: "gait-multi-modal-fusion", Showcase: GaitShowcase },
    { slug: "ludex", Showcase: LudexShowcase },
    { slug: "modified-double-unet", Showcase: DoubleUNetShowcase },
] as const;

export default function CaseStudyZone() {
    const rootRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const root = rootRef.current;
            if (!root) return;

            const mm = gsap.matchMedia();

            /* The boundary is not gated on motion or width: the palette
               shift and framing apply everywhere, only the pinning is
               conditional. */
            const boundary = ScrollTrigger.create({
                trigger: root,
                start: "top top",
                end: "bottom bottom",
                onToggle: (self) =>
                    document.documentElement.classList.toggle(
                        "zone-immersive",
                        self.isActive,
                    ),
            });

            mm.add(
                "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
                () => {
                    const wraps = gsap.utils.toArray<HTMLElement>(
                        "[data-chapter-pin]",
                        root,
                    );

                    const tweens = wraps.map((wrap) => {
                        const card = wrap.querySelector("[data-chapter-card]");
                        if (!card) return null;

                        /* Hold, then release. A card that starts fading the
                           instant it pins never reads as pinned at all. */
                        const tl = gsap.timeline({
                            scrollTrigger: {
                                trigger: wrap,
                                start: "top top",
                                end: "bottom bottom",
                                scrub: true,
                            },
                        });
                        tl.to(card, { duration: 0.45 }).to(card, {
                            opacity: 0,
                            y: -48,
                            duration: 0.55,
                            ease: "none",
                        });
                        return tl;
                    });

                    return () => {
                        tweens.forEach((tl) => {
                            tl?.scrollTrigger?.kill();
                            tl?.kill();
                        });
                    };
                },
            );

            return () => {
                boundary.kill();
                mm.revert();
                /* Never strand the site retinted — a route change mid-zone
                   would otherwise leave the deep palette applied. */
                document.documentElement.classList.remove("zone-immersive");
            };
        },
        { scope: rootRef },
    );

    return (
        <div ref={rootRef}>
            {/* Cinematic framing. Fixed, inert, always mounted; only their
                opacity changes, driven by the `zone-immersive` class. */}
            <div className="zone-vignette" aria-hidden="true" />
            <div className="zone-bar zone-bar--top" aria-hidden="true" />
            <div className="zone-bar zone-bar--bottom" aria-hidden="true" />

            {CHAPTERS.map(({ slug, Showcase }) => (
                <div key={slug}>
                    <div data-chapter-pin className="zone-pin">
                        <div className="zone-pin-stage">
                            <div data-chapter-card className="w-full">
                                {/* h2, not h1 — the page's h1 is the hero. */}
                                <CaseStudyHero slug={slug} as="h2" />
                            </div>
                        </div>
                    </div>

                    {/* brief: intro, how, results, figures, CTAs — and a link
                        to the route for anyone who wants the depth. The
                        second gallery, the interactive pipeline and the
                        limitations blocks render on /work/* only. */}
                    <Showcase brief />
                </div>
            ))}
        </div>
    );
}
