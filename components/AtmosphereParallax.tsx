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
            tl
                /* The three accent glows used to travel here too. They are
                   gone from the design, so this timeline drives one layer.
                   Kept as a timeline rather than collapsed to a bare tween:
                   the single-ScrollTrigger point below still stands if a
                   second layer is ever added back. */
                /* The grid moves by TRANSFORM now, not backgroundPositionY.
                   background-position is a paint property, so the old version
                   repainted a full-viewport grid overlay on every scroll
                   frame. The element is bled by one whole 64px tile in
                   globals.css, so translating it can no longer expose an edge
                   — which was the original reason for using background
                   position here. */
                .to(".atmosphere-grid", { y: TRAVEL.grid, ease: "none" }, 0);

            /* Stand down inside the case-study zone. The grid is dimmed to
               0.16 and sits behind a vignette in there, so almost none of its
               travel is visible — and this is the longest region of the page
               by a wide margin.

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
