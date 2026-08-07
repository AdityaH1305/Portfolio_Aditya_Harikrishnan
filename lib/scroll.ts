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

/** Media query used across the app to detect the reduced-motion preference. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
