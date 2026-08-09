"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getLenis } from "@/lib/lenis";
import { ScrollTrigger } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   RouteScrollReset

   ScrollProvider lives in the root layout, so a single Lenis
   instance survives every client-side navigation. Lenis holds
   its scroll position internally, independent of the DOM, and
   nothing in Next's default scroll restoration knows about it.

   Without this, navigating from halfway down the home page to
   a case study lands on the new page still reading ~4000px —
   and every ScrollTrigger on it measures against that stale
   position. Same failure class as the autoRaf bug: the page
   looks broken in a way that points nowhere near the cause.

   `immediate` skips the 1.8s glide (animating a route change
   is just a long blank scroll), and `force` lets it through
   even if something still holds a scroll lock.
   ══════════════════════════════════════════════════════ */

export default function RouteScrollReset() {
    const pathname = usePathname();

    /* Skip the very first run. On a cold load the page is already at 0,
       and forcing a reset would defeat a deep link like `/#work`. */
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }

        /* A hash target owns the scroll position. The back link is `/#work`,
           so resetting there would race Next's hash scroll and win or lose on
           effect ordering — sending the reader to the top of the home page
           instead of back to the card they came from. The refresh below still
           has to run either way. */
        if (!window.location.hash) {
            getLenis()?.scrollTo(0, { immediate: true, force: true });
        }

        /* One frame later: the incoming route's DOM is committed by then,
           so ScrollTrigger re-measures against real geometry. Late-loading
           images are covered by ScrollTrigger's own load listener. */
        const id = requestAnimationFrame(() => ScrollTrigger.refresh());
        return () => cancelAnimationFrame(id);
    }, [pathname]);

    return null;
}
