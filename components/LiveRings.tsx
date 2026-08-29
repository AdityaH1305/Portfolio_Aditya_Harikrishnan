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
   two or three should ever be running.

   ── Geometry alone is not enough for the case-study slides ──
   `.zone-act` is `position: absolute; inset: 0` inside one sticky 100vh
   box, and every slide in an act is stacked the same way — so all eight
   `.zone-act-slide-frame.shell-bezel` elements share the IDENTICAL bounding
   rect for the entire ~11,700px the zone travels. IntersectionObserver
   reports all eight as intersecting simultaneously, which is what the first
   version of this file did: eight conic-gradient rings repainting every
   frame when at most one or two are actually visible, painting over the
   other seven with `opacity: 0` / `visibility: hidden`.

   Only opacity/visibility — which GSAP writes as inline styles on the act
   and slide elements during the choreography — actually says which one is
   on screen. `visibility` is inherited, so a `.shell-bezel` reads the right
   answer from its ancestor without GSAP ever touching the bezel itself; a
   `MutationObserver` scoped to the zone's own subtree (never the whole
   document — the cursor and the scroll bar rewrite inline styles every
   frame too, and watching those would cost more than this saves) re-checks
   on the next animation frame whenever one of those styles changes.

   ── Why one IntersectionObserver and not a trigger per element ──
   A ScrollTrigger each would be fourteen entries in the scroll path for
   what is a binary on/off with no scrub. One IntersectionObserver watching
   every target costs one callback per crossing and nothing in between.

   ── Why it lives in template.tsx ──
   `layout.tsx` persists across navigations, so an effect there would scan
   once and never see the media on the next route. `template.tsx` remounts
   on every navigation, which is precisely the rescan this needs. The
   elements it watches are all server-rendered, so they exist by the time
   this effect runs.

   Reduced motion returns before observing anything: the CSS already stops
   the sweep there, and a reader who has asked for no motion should not
   also be paying for the listener that would have enabled it.
   ══════════════════════════════════════════════════════ */

export default function LiveRings() {
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const targets = Array.from(
            document.querySelectorAll<HTMLElement>(RINGED),
        );
        if (targets.length === 0) return;

        const intersecting = new Set<HTMLElement>();

        /* Cheap on purpose: `getComputedStyle` here reads properties that do
           not depend on layout (opacity, visibility), so this never forces
           the reflow a `getBoundingClientRect` read would. */
        const isPainted = (el: HTMLElement) => {
            const cs = getComputedStyle(el);
            return cs.visibility !== "hidden" && cs.opacity !== "0";
        };

        const apply = (el: HTMLElement) => {
            el.classList.toggle(
                "ring-live",
                intersecting.has(el) && isPainted(el),
            );
        };

        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const el = entry.target as HTMLElement;
                    if (entry.isIntersecting) intersecting.add(el);
                    else intersecting.delete(el);
                    apply(el);
                }
            },
            /* A little margin, so a ring is already turning by the time it is
               properly on screen rather than starting from a standstill in
               front of the reader. */
            { rootMargin: "10% 0px" },
        );

        targets.forEach((t) => io.observe(t));

        /* Scoped to the zone's own scroller, not `document.body` — the
           cursor and the scroll progress bar write an inline `transform`
           every single frame, and a document-wide observer would fire for
           every one of those and cost more than the rings it is meant to
           save. The zone is the only place geometry can't already tell two
           ringed elements apart, so it is the only place that needs this.

           ── Only the targets a mutation could actually have changed ──
           The first version rechecked EVERY intersecting target on every
           frame the observer fired, and inside the zone the choreography
           writes inline style on every scrub frame, so that was all eight
           stacked slide frames, continuously, for the whole 11,700px of zone
           travel. The first `getComputedStyle` after GSAP has written style
           forces a recalculation; the other seven then ride the clean tree,
           so the cost was one flush plus seven reads rather than eight
           flushes — but it was still being paid for elements that could not
           have changed.

           The mutation records already say which elements moved. A ringed
           target's paintedness can only have changed if it IS one of those,
           or sits inside one (the bezels inherit `visibility` from the
           `.zone-act-slide` and `.zone-act` that `autoAlpha` writes). So a
           rest window where only the head drifts touches no bezel and costs
           nothing at all, and a slide hop costs two or three rather than
           eight. `contains` walks the tree without reading layout. */
        const zoneRoot = document.querySelector(".zone-scroll");
        let mo: MutationObserver | null = null;
        if (zoneRoot) {
            let pending = false;
            const touched = new Set<Node>();

            const recheck = () => {
                pending = false;
                for (const t of targets) {
                    if (!intersecting.has(t)) continue;
                    for (const m of touched) {
                        if (m === t || m.contains(t)) {
                            apply(t);
                            break;
                        }
                    }
                }
                touched.clear();
            };

            mo = new MutationObserver((records) => {
                for (const r of records) touched.add(r.target);
                if (pending) return;
                pending = true;
                requestAnimationFrame(recheck);
            });
            mo.observe(zoneRoot, {
                attributes: true,
                attributeFilter: ["style"],
                subtree: true,
            });
        }

        return () => {
            io.disconnect();
            mo?.disconnect();
        };
    }, []);

    return null;
}
