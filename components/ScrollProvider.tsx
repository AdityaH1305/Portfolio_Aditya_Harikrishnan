"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import type Lenis from "lenis";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";
import { registerLenis } from "@/lib/lenis";
import {
    SCROLL_DURATION,
    SCROLL_DURATION_REDUCED,
    SCROLL_EASING,
    prefersReducedMotion,
} from "@/lib/scroll";

/* ══════════════════════════════════════════════════════
   ScrollProvider

   Owns the single scroll driver for the page.

   Lenis runs with autoRaf: false and is stepped by GSAP's
   ticker instead. Leaving autoRaf on while also calling
   lenis.raf from the ticker double-steps the scroll and
   roughly doubles its speed — and it looks like it works,
   which is what makes it easy to miss.

   `anchors: true` makes Lenis intercept every href="#..."
   on the page, so SideNav and the Hero CTA need no edits.

   Reduced motion keeps Lenis at a much shorter duration;
   the scroll-linked effects gate themselves off via
   gsap.matchMedia in their own components.
   ══════════════════════════════════════════════════════ */

registerGsap();

export default function ScrollProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const lenisRef = useRef<LenisRef>(null);

    useEffect(() => {
        /* Read the ref INSIDE the ticker, never once up front.
           ReactLenis populates it from its own effect, and under React's
           StrictMode double-invoke the instance is torn down and rebuilt —
           so a one-shot `const lenis = ref.current; if (!lenis) return;`
           can miss it permanently. With autoRaf:false that means nothing
           ever calls lenis.raf(), and the result is a page that swallows
           wheel events and never moves: Lenis captures the input, flags
           itself lenis-scrolling, and the scroll position stays at 0. */
        let bound: Lenis | null = null;

        const tick = (time: number) => {
            const lenis = lenisRef.current?.lenis;
            if (!lenis) return;

            if (bound !== lenis) {
                bound?.off("scroll", ScrollTrigger.update);
                // Keep ScrollTrigger's idea of scroll position tied to Lenis,
                // or scrub runs against a stale position during the glide.
                lenis.on("scroll", ScrollTrigger.update);
                registerLenis(lenis);
                bound = lenis;
            }

            // gsap.ticker reports seconds; lenis.raf expects milliseconds.
            lenis.raf(time * 1000);
        };

        gsap.ticker.add(tick);

        // Without this, GSAP fabricates catch-up frames after a stall and
        // Lenis lurches forward.
        gsap.ticker.lagSmoothing(0);

        return () => {
            gsap.ticker.remove(tick);
            bound?.off("scroll", ScrollTrigger.update);
            registerLenis(null);
        };
    }, []);

    return (
        <ReactLenis
            root
            ref={lenisRef}
            options={{
                duration: prefersReducedMotion()
                    ? SCROLL_DURATION_REDUCED
                    : SCROLL_DURATION,
                easing: SCROLL_EASING,
                anchors: true,
                autoRaf: false,
                // Touch devices have their own momentum; smoothing it again
                // makes the page feel detached from the finger.
                syncTouch: false,
            }}
        >
            {children}
        </ReactLenis>
    );
}
