"use client";

import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";
import { ZONE_EVENT } from "@/lib/zone";

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
            /* ONE ScrollTrigger, not four.
               Each of these tweens previously carried its own identical
               scrollTrigger config, so the page ran four separate scrubbed
               triggers that measured and updated independently. A single
               timeline does the same work once. */
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: document.body,
                    start: 0,
                    end: "max",
                    scrub: true,
                },
            });

            // ease "none" is required: an eased parallax decouples from
            // scroll position and drifts out of sync on fast scrolls.
            tl.to(".atmosphere-glow--hero", { y: TRAVEL.glowHero, ease: "none" }, 0)
                .to(".atmosphere-glow--mid", { y: TRAVEL.glowMid, ease: "none" }, 0)
                .to(".atmosphere-glow--lower", { y: TRAVEL.glowLower, ease: "none" }, 0)
                /* The grid moves by TRANSFORM now, not backgroundPositionY.
                   background-position is a paint property, so the old version
                   repainted a full-viewport grid overlay on every scroll
                   frame. The element is bled by one whole 64px tile in
                   globals.css, so translating it can no longer expose an edge
                   — which was the original reason for using background
                   position here. */
                .to(".atmosphere-grid", { y: TRAVEL.grid, ease: "none" }, 0);

            /* Stand down inside the case-study zone. Four promoted layers move
               every frame here, and in there the grid is at opacity 0.25
               behind a vignette — almost none of it is visible, and it is the
               longest region of the page.

               disable(false) leaves the current transforms in place; passing
               true would revert them, so the layers would jump back to their
               untranslated positions the moment the zone was entered. */
            const st = tl.scrollTrigger;

            const onZone = (e: Event) => {
                const { active } = (e as CustomEvent<{ active: boolean }>)
                    .detail;
                if (active) st?.disable(false);
                else st?.enable();
            };
            window.addEventListener(ZONE_EVENT, onZone);

            return () => {
                window.removeEventListener(ZONE_EVENT, onZone);
                tl.scrollTrigger?.kill();
                tl.kill();
                ScrollTrigger.refresh();
            };
        });

        return () => mm.revert();
    });

    return null;
}
