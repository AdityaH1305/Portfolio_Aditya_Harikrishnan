"use client";

import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   AtmosphereParallax

   Drives the (server-rendered, static) BackgroundAtmosphere
   layers at different depths.

   This codebase already shipped a parallax bug once: the
   removed loop applied `scrollY * -8` through `scrollY * -30`
   — raw scroll pixels, unbounded — so every layer was
   thousands of px off-screen after a little scrolling.

   The structural fix is not a smaller multiplier, it is to
   never multiply scrollY at all. Travel here is a fixed
   number of px across the whole page, tweened between two
   endpoints by ScrollTrigger. Bounded by construction.

   Invariant worth grepping for: no parallax tween may read
   window.scrollY.
   ══════════════════════════════════════════════════════ */

/** Total travel in px across the entire page, per layer. */
const TRAVEL = {
    glowHero: -80,
    glowMid: -160,
    glowLower: -240,
    grid: -40,
} as const;

export default function AtmosphereParallax() {
    registerGsap();

    useGSAP(() => {
        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const scrollTrigger = {
                trigger: document.body,
                start: 0,
                end: "max",
                scrub: true,
            } as const;

            // ease "none" is required: an eased parallax decouples from
            // scroll position and drifts out of sync on fast scrolls.
            const tweens = [
                gsap.to(".atmosphere-glow--hero", {
                    y: TRAVEL.glowHero,
                    ease: "none",
                    scrollTrigger,
                }),
                gsap.to(".atmosphere-glow--mid", {
                    y: TRAVEL.glowMid,
                    ease: "none",
                    scrollTrigger,
                }),
                gsap.to(".atmosphere-glow--lower", {
                    y: TRAVEL.glowLower,
                    ease: "none",
                    scrollTrigger,
                }),
                // The grid is a repeating 64px tile, so shift the background
                // rather than the element — translating it would expose a gap
                // at the bottom edge.
                gsap.to(".atmosphere-grid", {
                    backgroundPositionY: `${TRAVEL.grid}px`,
                    ease: "none",
                    scrollTrigger,
                }),
            ];

            return () => {
                tweens.forEach((t) => {
                    t.scrollTrigger?.kill();
                    t.kill();
                });
                ScrollTrigger.refresh();
            };
        });

        return () => mm.revert();
    });

    return null;
}
