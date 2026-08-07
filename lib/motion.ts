"use client";

import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ══════════════════════════════════════════════════════
   Motion foundation

   The site has one motion signature — cubic-bezier(0.32,
   0.72, 0, 1). It lives in the CSS `--ease` token and is
   registered here as a GSAP CustomEase under the same
   name, so JS and CSS animations stay on one curve.

   GSAP's named eases (power2.out etc.) do NOT match it,
   which is why CustomEase is worth the import.

   SplitText and Flip are registered by the two components
   that use them, not here.
   ══════════════════════════════════════════════════════ */

/** Name of the shared CustomEase. Pass as `ease` to any tween. */
export const EASE = "signal";

export const DUR = {
    fast: 0.3,
    base: 0.5,
    slow: 0.8,
} as const;

/** Distance in px that revealed elements travel. */
export const REVEAL_Y = 20;

let registered = false;

/** Register GSAP plugins and the shared ease exactly once. */
export function registerGsap(): void {
    if (registered || typeof window === "undefined") return;
    registered = true;

    // CustomEase must be registered too, not just imported — GSAP otherwise
    // warns "Please gsap.registerPlugin(CustomEase)" and discards the ease,
    // so every `ease: EASE` silently falls back to GSAP's default and the
    // site stops matching its own CSS --ease curve.
    gsap.registerPlugin(ScrollTrigger, CustomEase);
    CustomEase.create(EASE, "0.32,0.72,0,1");
}

export { gsap, ScrollTrigger };
