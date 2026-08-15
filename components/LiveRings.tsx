"use client";

import { useEffect } from "react";

/**
 * Every element that wears a ring.
 *
 * MUST MATCH the `:is(.live-ring, .shell-bezel)` selector list in
 * globals.css. Scanning only `.live-ring` was the first version, and it left
 * every media mat on the site paused forever — the CSS drew a ring on them
 * and nothing ever turned it on, which looks exactly like a static hairline
 * and reports no error anywhere.
 */
const RINGED = ".live-ring, .shell-bezel";

/* ══════════════════════════════════════════════════════
   LiveRings — the one gate for every animated outline

   The rings on the capability cards and on every media mat
   are pure CSS (`.live-ring` in globals.css). This decides
   WHEN each of them may run, and it is the whole reason the
   effect can be afforded at all.

   ── Why gating is not optional ──
   A conic gradient repaints its element every frame. The
   home page carries fourteen ringed elements — four
   capability cards, eight case-study slides, two project
   cards — and the atlas canvas is already drawing. Running
   all fourteen for the length of a session is exactly the
   cost this codebase sheds everywhere else. In view, at most
   two or three are ever running.

   ── Why one observer and not a trigger per element ──
   A ScrollTrigger each would be fourteen entries in the
   scroll path for what is a binary on/off with no scrub. One
   IntersectionObserver watching every target costs one
   callback per crossing and nothing in between.

   ── Why it lives in template.tsx ──
   `layout.tsx` persists across navigations, so an effect
   there would scan once and never see the media on the next
   route. `template.tsx` remounts on every navigation, which
   is precisely the rescan this needs. The elements it
   watches are all server-rendered, so they exist by the time
   this effect runs.

   Reduced motion returns before observing anything: the CSS
   already stops the sweep there, and a reader who has asked
   for no motion should not also be paying for the listener
   that would have enabled it.
   ══════════════════════════════════════════════════════ */

export default function LiveRings() {
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const targets = document.querySelectorAll<HTMLElement>(RINGED);
        if (targets.length === 0) return;

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    entry.target.classList.toggle(
                        "ring-live",
                        entry.isIntersecting,
                    );
                }
            },
            /* A little margin, so a ring is already turning by the time it is
               properly on screen rather than starting from a standstill in
               front of the reader. */
            { rootMargin: "10% 0px" },
        );

        targets.forEach((t) => io.observe(t));
        return () => io.disconnect();
    }, []);

    return null;
}
