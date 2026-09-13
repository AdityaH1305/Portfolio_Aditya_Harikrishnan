/* ══════════════════════════════════════════════════════
   Scroll tuning

   Every number that shapes how the page scrolls lives
   here. SCROLL_DURATION is the one most worth revisiting:
   heavier scroll reads as "designed" but fights people
   who scan fast. Dropping it to ~1.0 makes the site feel
   noticeably more responsive without losing smoothing.
   ══════════════════════════════════════════════════════ */

/** Seconds for Lenis to settle after an input. Higher = heavier glide. */
export const SCROLL_DURATION = 1.8;

/** Shorter, near-native glide used when reduced motion is requested. */
export const SCROLL_DURATION_REDUCED = 0.6;

/**
 * Ease-out expo. Fast departure, long settle — the curve that makes
 * the heavy duration feel intentional rather than laggy.
 */
export const SCROLL_EASING = (t: number): number =>
    t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

/* ══════════════════════════════════════════════════════
   A JUMP IS NOT A SCROLL

   Everything above tunes the WHEEL. Lenis uses the instance's
   `duration`/`easing` for wheel input as well as for
   programmatic scrolls (lenis.mjs, the wheel branch that
   spreads `this.options.duration` / `.easing`), so the two
   constants below exist to give a jump its own curve WITHOUT
   touching the glide — passed per call at
   lib/lenis.ts's `scrollTo` and as the `anchors` options
   object in components/ScrollProvider.tsx.

   ── THE REPORTED BUG, AND WHY IT WAS THE CURVE ──
   Clicking `01 Intro` then `05 Stack` scrolled choppily;
   short hops did not. Same curve, different distance.

   `SCROLL_EASING` above is ease-out expo, whose slope at
   t = 0 is 10·ln2 ≈ 6.93x its own average. Across the
   18,974px home page at 1.8s that is ~1,217px in a single
   frame — and the case-study choreography, the atlas and the
   cube title each get handed that as ONE step and render it
   as a jolt.
   Peak speed, not distance, exactly as
   components/ZoneTitle/word.ts:settle() documents for the
   cube word:

     "A cubic ease-in-out reaches a slope of 3x its own
      average at the midpoint, so a letter spends most of its
      window barely moving and then crosses the gap in a
      burst — which reads as a snap however long the window
      is. Lengthening the scroll span cannot fix that."

   word.test.ts asserts peak/mean <= 1.6 and calls anything
   above it a snap. Measured over 400 steps:

     SCROLL_EASING (expo-out)      6.93   <- four times the bar
     EASE, cubic-bezier(.32,.72,0,1) 4.22
     cubic easeInOut                3.00   <- already rejected once
     smoothstep                     1.50

   ── NOT lib/motion.ts's `EASE` ──
   Reusing the site's signature curve is the reflex move and
   it scores 4.22. Better than today, still well over the bar.
   ══════════════════════════════════════════════════════ */

/**
 * Smoothstep. THE SAME THREE LINES AS `settle()` in
 * components/ZoneTitle/word.ts, duplicated deliberately.
 *
 * `lib/` must not import from `components/` — the repo keeps that direction
 * (components/CtaRow.tsx records why `Cta` moved down into lib/). Two copies
 * of one curve is the lesser cost, and both carry a pointer to the other so
 * neither gets "cleaned up" into an import.
 */
export const JUMP_EASING = (t: number): number => {
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return c * c * (3 - 2 * c);
};

/**
 * Seconds for a jump, whatever the distance.
 *
 * Peak frame distance is `px / (40 * JUMP_DURATION)` — 40 being 60fps divided
 * by smoothstep's 1.5 peak. Measured against the home page's own 18,974px
 * (PERF_PLAN §7.5), which bounds the longest jump the site can produce:
 *
 *   whole page   1,217px/frame  ->  365px/frame
 *   ~900px hop      58px/frame  ->   17px/frame, and half a second sooner
 *
 * 3.3x smoother on the long flight and 28% FASTER than the 1.8s it replaces,
 * so nothing about this is a trade against the reader's time.
 *
 * 365px is not arbitrary either: a trackpad flick already drives this page at
 * 200-400px per frame and it copes, which is the whole point — the jump now
 * asks no more of the scroll-linked systems than a hurried reader already
 * does. What it never does again is open at three times that.
 *
 * ── ONE CONSTANT, NOT A FUNCTION OF DISTANCE ──
 * A distance-aware duration is better on paper and unreachable on the path
 * that matters: the nav rail goes through Lenis's own anchor interception,
 * which reads `options.anchors` as a STATIC object at click time. Making it
 * distance-aware would mean taking the anchor click over from Lenis. The
 * palette and the rail feeling identical is worth more than the difference on
 * a short hop.
 *
 * THE KNOB. Raising it trades directly against arrival time; lowering it
 * against smoothness. components/ZoneTitle/ZoneTitle.tsx:376-382 records span
 * and curve being confused for each other once already — this is the span,
 * `JUMP_EASING` is the curve, and they are not interchangeable.
 */
export const JUMP_DURATION = 1.3;

/* NO reduced-motion variant, and that is not an omission. Lenis forces
   `immediate = true` on any programmatic scroll when it is honouring the
   preference (`respectReducedMotion` defaults to true), so both the rail and
   the palette already land instantly and a duration constant for that case
   would be read by nothing. */

/** Media query used across the app to detect the reduced-motion preference. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
