"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE } from "@/lib/motion";

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

export default function Template({
    children,
}: {
    children: React.ReactNode;
}) {
    const root = useRef<HTMLDivElement>(null);

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

    return <div ref={root}>{children}</div>;
}
