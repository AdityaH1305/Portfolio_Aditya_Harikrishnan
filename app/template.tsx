"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, EASE } from "@/lib/motion";
import LiveRings from "@/components/LiveRings";
import DeviceTierFlag from "@/components/DeviceTierFlag";
import { entranceClaimed, releaseEntrance } from "@/lib/entrance";

/* ══════════════════════════════════════════════════════
   Route enter transition

   template.tsx re-mounts on every navigation (unlike
   layout.tsx, which persists), so this runs once per route
   change and once on first load.

   OPACITY ONLY — deliberately. This element wraps the whole
   route, and a `transform` on it would become the containing
   block for every `position: fixed` descendant: the atlas
   canvas, the side nav, the cursor glow, the lightbox and
   the video player would all reposition against this div
   instead of the viewport, jump for the length of the tween,
   then snap back when clearProps ran.

   (Note this is about `fixed`, not `sticky` — sticky is
   unaffected by a transformed ancestor.)

   Opacity creates a stacking context but not a containing
   block, so it is safe here. A cross-fade at the site's own
   1.8s-scroll pacing is enough; the page does not need to
   slide as well.

   NAVIGATIONS ONLY — never the first paint. `fromTo` applies
   its start values immediately, so fading in on a cold load
   would paint the server-rendered HTML, snap the entire page
   to invisible on hydration, then fade it back: a flash on
   every first load, and a deferred LCP for nothing. Hero.tsx
   documents the same trap for its own entrance.

   The flag is module scope, not a ref: template.tsx remounts
   on every navigation, so a ref would reset each time and
   every route would look like the first one.
   ══════════════════════════════════════════════════════ */

let hasNavigated = false;

/**
 * How long the page may hold before it shows itself regardless.
 *
 * A backstop against the rAF below never running, nothing more — the same
 * reasoning as Hero's own 1200ms one. A page that appears without its
 * animation is a small loss; a page that never appears is the site.
 *
 * IT DOES NOT COVER THE GATED PATH, and must not try to. The first version
 * was 2600ms flat, chosen to clear the 2000ms boot and its 420ms fade — but
 * the gate waits for a CLICK, and a reader who takes four seconds to press
 * "reestablish connection" would have had the whole page animate itself to
 * completion behind the overlay at 2.6s. That is the precise bug this
 * feature exists to remove, reintroduced by its own safety net. The gate
 * arms its own failsafe from the moment of the click instead, where the
 * duration is actually bounded.
 */
const ENTRANCE_FAILSAFE_MS = 1800;

export default function Template({
    children,
}: {
    children: React.ReactNode;
}) {
    const root = useRef<HTMLDivElement>(null);

    /* ── Releasing the entrance ────────────────────────
       Nothing on the page animates until this runs — see lib/entrance.ts for
       why. There are two paths and this owns the one without a gate.

       A FRAME LATER, and after a refresh, on purpose. A reload returns the
       reader to where they were, and ScrollTrigger has to have measured
       against THAT position before anything decides which elements are in
       view. Releasing synchronously here would create every Reveal trigger
       against the pre-restoration scroll and reveal the wrong screen.

       `entranceClaimed()` is how this stands down on a gated home load: the
       gate claims from its own effect, which React runs before this one
       because effects fire bottom-up, and then releases when its sequence
       finishes. */
    useEffect(() => {
        const id = requestAnimationFrame(() => {
            ScrollTrigger.refresh();
            if (!entranceClaimed()) releaseEntrance();
        });

        const failsafe = window.setTimeout(() => {
            /* An overlay actually on screen is not a stall — it is the
               entrance working, and it may sit there as long as the reader
               takes. Releasing behind it is the one thing this must never
               do. If the gate CLAIMED but is not rendered, something went
               wrong after the claim and the page would otherwise stay held
               forever, so that case does release. */
            if (document.querySelector(".signal-gate")) return;
            releaseEntrance();
        }, ENTRANCE_FAILSAFE_MS);

        return () => {
            cancelAnimationFrame(id);
            window.clearTimeout(failsafe);
        };
    }, []);

    useGSAP(
        () => {
            if (!hasNavigated) {
                hasNavigated = true;
                return;
            }

            const mm = gsap.matchMedia();

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const tween = gsap.fromTo(
                    root.current,
                    { opacity: 0 },
                    {
                        opacity: 1,
                        duration: 0.45,
                        ease: EASE,
                        // Leave no inline opacity behind: a stacking context
                        // that outlives the tween changes how the fixed
                        // overlays composite against the page.
                        clearProps: "opacity",
                    },
                );
                return () => tween.kill();
            });

            return () => mm.revert();
        },
        { scope: root },
    );

    return (
        <div ref={root}>
            {/* Mounted HERE rather than in layout.tsx: it scans the DOM once
                for ringed elements, and layout persists across navigations so
                it would never see the next route's media. Renders nothing. */}
            <LiveRings />
            {/* Writes `data-tier` on <html> so CSS can stand down on a weak
                device the same way the canvases already do. Renders nothing. */}
            <DeviceTierFlag />
            {children}
        </div>
    );
}
