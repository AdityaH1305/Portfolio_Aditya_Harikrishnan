"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { ZONE_PANELS } from "@/components/zone/ZonePanels";

/* ══════════════════════════════════════════════════════
   CaseStudyZone — the immersive sequence

   A tall wrapper with a sticky full-height stage inside it.
   Each of the three case studies takes over the viewport in
   turn as you scroll, then the stage releases and the site
   returns to normal.

   ── CSS sticky, not ScrollTrigger.pin ──
   Lenis runs in default mode on real window scroll, so
   native sticky works and needs no scrollerProxy. Pinning
   would insert spacer elements and rewrite layout for the
   same result. LudexShowcase already uses this pattern.

   The stage must stay a plain element — wrapping it in
   Reveal would make it a stretched grid item with zero
   sticky travel, which this repo has shipped before.

   ── Two ScrollTriggers, no more ──
   One scrubbed timeline for the panels, one boundary trigger
   for the `zone-immersive` class. Everything animated is
   transform or autoAlpha, so the frame budget recovered in
   the optimisation pass stays intact.

   autoAlpha rather than opacity is deliberate: GSAP flips
   `visibility` with it, so an off-screen panel stops being
   composited and its links stop being focusable — without
   toggling anything per frame.
   ══════════════════════════════════════════════════════ */

/** Viewport heights of scroll per case study. */
const SCREENS_PER_PANEL = 1.5;

export default function CaseStudyZone() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const wrap = wrapRef.current;
            const stage = stageRef.current;
            if (!wrap || !stage) return;

            const mm = gsap.matchMedia();

            /* Matches .zone-pinned's own media query. Below lg, or under
               reduced motion, the pinned stage is display:none and the
               stacked fallback is what renders — so there is nothing here
               to drive. */
            mm.add(
                "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
                () => {
                    const panels = gsap.utils.toArray<HTMLElement>(
                        "[data-zone-panel]",
                        stage,
                    );
                    if (panels.length === 0) return;

                    // Panel 0 is on screen the moment the zone is entered.
                    gsap.set(panels, { autoAlpha: 0 });
                    gsap.set(panels[0], { autoAlpha: 1 });

                    const boundary = ScrollTrigger.create({
                        trigger: wrap,
                        start: "top top",
                        end: "bottom bottom",
                        onToggle: (self) =>
                            document.documentElement.classList.toggle(
                                "zone-immersive",
                                self.isActive,
                            ),
                    });

                    /* scrub: true, not a number — Lenis already eases the
                       scroll, and a second smoothing stage reads as lag. */
                    const tl = gsap.timeline({
                        scrollTrigger: {
                            trigger: wrap,
                            start: "top top",
                            end: "bottom bottom",
                            scrub: true,
                        },
                    });

                    panels.forEach((panel, i) => {
                        const els = panel.querySelectorAll("[data-zone-el]");

                        // Panel 0 has no entry: it is already visible.
                        if (i > 0) {
                            tl.fromTo(
                                panel,
                                { autoAlpha: 0, scale: 1.03 },
                                {
                                    autoAlpha: 1,
                                    scale: 1,
                                    duration: 0.28,
                                    ease: "none",
                                },
                                i,
                            );
                        }

                        tl.fromTo(
                            els,
                            { y: 36, opacity: 0 },
                            {
                                y: 0,
                                opacity: 1,
                                duration: 0.3,
                                stagger: 0.045,
                                ease: "none",
                            },
                            i > 0 ? i + 0.06 : 0,
                        );

                        // The last panel holds to the end instead of leaving.
                        if (i < panels.length - 1) {
                            tl.to(
                                panel,
                                {
                                    autoAlpha: 0,
                                    scale: 0.985,
                                    duration: 0.26,
                                    ease: "none",
                                },
                                i + 0.74,
                            );
                        }
                    });

                    return () => {
                        boundary.kill();
                        tl.scrollTrigger?.kill();
                        tl.kill();
                        // Never leave the site retinted if the zone unmounts
                        // mid-scroll — a route change here would strand it.
                        document.documentElement.classList.remove(
                            "zone-immersive",
                        );
                    };
                },
            );

            return () => mm.revert();
        },
        { scope: wrapRef },
    );

    return (
        <>
            {/* ── Cinematic framing ──
                Fixed, inert, and always mounted; only their opacity changes,
                driven by the `zone-immersive` class. Rendering them here
                keeps them next to the logic that reveals them. */}
            <div className="zone-vignette" aria-hidden="true" />
            <div className="zone-bar zone-bar--top" aria-hidden="true" />
            <div className="zone-bar zone-bar--bottom" aria-hidden="true" />

            {/* ── Pinned sequence (lg+, motion allowed) ── */}
            <div
                ref={wrapRef}
                className="zone-pinned relative"
                style={{ height: `${SCREENS_PER_PANEL * ZONE_PANELS.length * 100}vh` }}
            >
                <div
                    ref={stageRef}
                    className="sticky top-0 h-screen overflow-hidden flex items-center"
                >
                    {ZONE_PANELS.map((Panel, i) => (
                        <div
                            key={i}
                            data-zone-panel={i}
                            className="absolute inset-0 flex items-center"
                        >
                            <Panel />
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stacked fallback (below lg, or reduced motion) ──
                Same three compositions, no pinning and no scrub. */}
            <div className="zone-stacked">
                {ZONE_PANELS.map((Panel, i) => (
                    <div
                        key={i}
                        className="py-20 md:py-28 border-t border-edge first:border-t-0"
                    >
                        <Panel />
                    </div>
                ))}
            </div>
        </>
    );
}
