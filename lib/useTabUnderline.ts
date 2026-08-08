"use client";

import { useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   useTabUnderline

   Slides a single underline element to sit under the
   active tab, by measuring the button directly.

   Replaces the shared-layout projection Framer used to
   do: one persistent bar tweened to a measured position,
   rather than one element per tab cross-faded.

   Contract — the caller MUST satisfy both, or the bar
   lands in the wrong place:
     • `rowRef` is position:relative
     • `rowRef` is the direct offsetParent of every button
       AND of the underline span
   because the tween reads `btn.offsetLeft`, which is
   relative to the offsetParent, not the page.
   ══════════════════════════════════════════════════════ */

export interface TabUnderline<T extends HTMLElement> {
    /** Put on the tab row. Must be position:relative. */
    rowRef: RefObject<HTMLDivElement | null>;
    /** Collect each tab button: ref={(el) => { tabRefs.current[i] = el; }} */
    tabRefs: RefObject<(T | null)[]>;
    /** Put on the underline span. */
    underlineRef: RefObject<HTMLSpanElement | null>;
}

export function useTabUnderline<T extends HTMLElement = HTMLButtonElement>(
    activeIndex: number,
): TabUnderline<T> {
    const rowRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(T | null)[]>([]);
    const underlineRef = useRef<HTMLSpanElement>(null);

    useGSAP(
        () => {
            const move = (animate: boolean) => {
                const btn = tabRefs.current[activeIndex];
                const bar = underlineRef.current;
                if (!btn || !bar) return;
                gsap.to(bar, {
                    x: btn.offsetLeft,
                    width: btn.offsetWidth,
                    duration: animate ? 0.3 : 0,
                    ease: EASE,
                    overwrite: "auto",
                });
            };

            move(false);

            /* Re-measure after the webfont swaps in: next/font uses
               display:swap, so button widths change once Space Grotesk
               replaces the fallback and the underline would be stale. */
            const row = rowRef.current;
            const ro = new ResizeObserver(() => move(false));
            if (row) ro.observe(row);
            document.fonts?.ready.then(() => move(false));

            return () => ro.disconnect();
        },
        { dependencies: [activeIndex] },
    );

    return { rowRef, tabRefs, underlineRef };
}
