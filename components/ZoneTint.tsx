"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   ZoneTint — the case-study room, scrubbed

   The room used to darken by re-pointing four `--surface-*` tokens on
   `html.zone-immersive`. Those are `@property`-registered with
   `inherits: true`, so transitioning them re-matched all 659 nodes every
   frame — 33.8ms against a 16.7ms budget (the measurement lives in
   globals.css). Dropping the transition made it cheap and instant, and
   instant is exactly what read as a switch being flipped: the grid, the nav,
   the atlas and the vignette all fade over 1200ms, and the flat page ground
   underneath them jumped in one frame. That mismatch was the whole problem.

   One fixed overlay's opacity is compositor work. It costs nothing per frame
   AND it can be tied to scroll position rather than to a clock, which is the
   one thing the token swap could never be.

   ── WHY THIS LIVES IN page.tsx AND NOT IN CaseStudyZone ──
   Paint order here is TREE ORDER. Every ambient layer is `fixed;
   z-index: 0`; every `<section>` is `position: relative; z-index: auto`; and
   `<main>` is `relative` with no z-index, so it creates no stacking context.
   All of them therefore paint in one bucket, ordered by DOM position.

   Mounted first in the Background Systems block, this plane sits above the
   page ground and below the grid, the grain, the atlas and every section's
   content — so the ground darkens while the work, the diagram and the
   texture all keep painting at full strength over it.

   Mounted inside `CaseStudyZone` it would be downstream of `#work`'s own
   header in the tree, and the ramp-in window is precisely when that header
   is on screen: it would darken the section's eyebrow, headline and lead
   while they are being read.

   ── TWO TRIGGERS, NOT ONE TIMELINE ──
   `.zone-stage` is sticky at the top of the scroller, so `top bottom` →
   `top top` is exactly the 100vh over which act one rises into frame and
   locks. The light goes down as the first case study arrives — not a
   coincidence, it is the only window on the page where that is true.
   `bottom bottom` → `bottom top` is its mirror as the stage unsticks.

   A single proportional timeline scrubbed across the whole zone would be
   tidier code but would have to bake in `--zone-acts` and the 400vh-per-act
   constant, and BOTH only exist inside the choreographed media query — below
   1024px, under reduced motion and with scripting off, `.zone-scroll` is a
   plain natural-flow stack. Two viewport-relative ranges are layout-agnostic
   and stay correct at every breakpoint.

   The one invariant: the zone must be at least 200vh tall, or the two ranges
   overlap. They no longer FIGHT if that happens — the two progresses are
   composed arithmetically below, not raced — but they would multiply, and
   the room would never reach full depth before it started lifting again.
   Wrong rather than broken, and silent either way. The stacked mobile zone is
   ~9 screens, so the margin is very wide.
   ══════════════════════════════════════════════════════ */

export default function ZoneTint() {
    const ref = useRef<HTMLDivElement>(null);

    registerGsap();

    useGSAP(() => {
        const el = ref.current;
        if (!el) return;

        /* Server-rendered by FeaturedWork and NOT behind `dynamic`, so it is
           in the DOM by the time this effect runs — React commits the whole
           tree before running effects. A selector rather than a ref because
           the element is three components away with no props path, the same
           reason ZoneTitle reaches for `[data-zone-title]`. */
        const zone = document.querySelector<HTMLElement>(".zone-scroll");
        if (!zone) return;

        /* The room's depth lives in CSS, once. Reading it here rather than
           typing a number means tuning the room is a one-line CSS edit and
           `.zone-bar` — which has to mix the same value statically, because
           it paints above this overlay — can never fall out of step with it. */
        const peak =
            Number.parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue(
                    "--zone-tint-alpha",
                ),
            ) || 0;

        /* ── TWO PROGRESS READINGS, ONE WRITE — NOT TWO TWEENS ──
           The obvious build is a scrubbed `fromTo` per ramp. It does not
           work, and the failure is silent: two tweens animating the SAME
           property on the SAME element fight over it, and `fromTo` applies
           its from-state at BUILD time. Measured on a real build, the exit
           tween's `{ opacity: peak }` leaked through even with
           `immediateRender: false` — the overlay sat at 0.147 at the very top
           of the page, where the entry ramp's own progress is provably 0.
           A permanently dimmed site, from a tween whose range nobody had
           reached.

           So neither ramp owns the property. Each trigger only REPORTS its
           progress, and one `quickSetter` composes them into a single write.
           `ramp` opens the room, `exit` closes it, and the hold between them
           falls out of the arithmetic for free (ramp 1, exit 0) rather than
           being a tween's finished state left lying around.

           `onRefresh` alongside `onUpdate` is what makes every INITIAL scroll
           position correct — a reload deep inside the zone, or below it
           entirely — because ScrollTrigger clamps progress to 0 or 1 for a
           range that is wholly ahead of or behind the current position.
           `onUpdate` alone only ever fires while a trigger is active, so
           those two cases would never be written at all. */
        const set = gsap.quickSetter(el, "opacity");
        let ramp = 0;
        let exit = 0;
        const apply = () => set(peak * ramp * (1 - exit));

        const entry = ScrollTrigger.create({
            trigger: zone,
            start: "top bottom",
            end: "top top",
            invalidateOnRefresh: true,
            onUpdate: (self) => {
                ramp = self.progress;
                apply();
            },
            onRefresh: (self) => {
                ramp = self.progress;
                apply();
            },
            /* Pin the endpoints. A fast flick can carry the scroll clean past
               a range without `onUpdate` ever landing on exactly 0 or 1. */
            onLeave: () => {
                ramp = 1;
                apply();
            },
            onLeaveBack: () => {
                ramp = 0;
                apply();
            },
        });

        const leave = ScrollTrigger.create({
            trigger: zone,
            start: "bottom bottom",
            end: "bottom top",
            invalidateOnRefresh: true,
            onUpdate: (self) => {
                exit = self.progress;
                apply();
            },
            onRefresh: (self) => {
                exit = self.progress;
                apply();
            },
            onLeave: () => {
                exit = 1;
                apply();
            },
            onLeaveBack: () => {
                exit = 0;
                apply();
            },
        });

        return () => {
            /* Never strand the site tinted. A route change from inside the
               zone would otherwise leave the overlay up over /work/*, which
               is the same non-idempotent leftover `CaseStudyZone` guards
               against with its own `setImmersive(false)`. */
            entry.kill();
            leave.kill();
            gsap.set(el, { opacity: 0, clearProps: "willChange" });
        };
    });

    return <div ref={ref} className="zone-tint" aria-hidden="true" />;
}
