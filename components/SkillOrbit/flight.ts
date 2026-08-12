/* ══════════════════════════════════════════════════════
   Fling timing

   Split out of engine.ts because it is pure arithmetic and
   because it encodes a promise — "a flung body is back in
   orbit within N seconds" — that is worth asserting rather
   than hoping for. engine.ts itself has no testable surface
   (canvas, rAF, pointer state); this does.

   ── What went wrong the first time ──
   There was no timer at all. A flung body integrated
   velocity against friction and only rejoined its orbit once
   speed fell below 40 px/s, with `DRAG_DECAY` at 0.86 PER
   SECOND. Solving `t = ln(40/v₀) / ln(0.86)` gives 16.7s for
   a gentle 500 px/s flick and 24s for a brisk 1500 px/s one,
   and total flight distance is `v₀ / −ln(0.86)` ≈ 6.6× the
   launch speed in pixels — thousands of pixels outside a
   932px panel. The body was, for practical purposes, gone.

   Friction is now what shapes the arc. A timer is what
   decides when the body comes home.
   ══════════════════════════════════════════════════════ */

/** Ceiling on release velocity, px/s. `delta × 12` is otherwise unbounded. */
export const MAX_FLING = 1200;

/**
 * Free-flight velocity decay per second.
 *
 * 0.12, not 0.86. Total distance travelled is `v₀ / −ln(DRAG_DECAY)`, so this
 * puts a maximum-speed fling at ~566px — far enough to read as a real throw,
 * near enough that the body is usually still on the panel when it turns
 * around.
 */
export const DRAG_DECAY = 0.12;

/** Hard cap on free flight, seconds, however fast the body is still moving. */
export const FREE_MAX_S = 1.7;

/**
 * Grace after the body leaves the field before the return begins.
 *
 * Short on purpose: past the edge it is invisible, and an invisible body
 * running out its full FREE_MAX_S just reads as having lost it.
 */
export const OFFSCREEN_GRACE_S = 0.4;

/** Eased travel back to the orbit slot, seconds. */
export const RETURN_S = 1.5;

/** Worst case from release to home. The number the whole module exists for. */
export const MAX_RETURN_S = FREE_MAX_S + RETURN_S;

export type FlightPhase = "free" | "return";

/**
 * Whether a body should still be flying or start heading home.
 *
 * `offFieldElapsed` is time since it left the panel bounds, or 0 while it is
 * still inside. Whichever limit trips first wins.
 */
export function flightPhase(
    freeElapsed: number,
    offFieldElapsed: number,
): FlightPhase {
    if (freeElapsed >= FREE_MAX_S) return "return";
    if (offFieldElapsed >= OFFSCREEN_GRACE_S) return "return";
    return "free";
}

/** Distance a fling of `speed` px/s covers before friction stops it. */
export function flightDistance(speed: number): number {
    return Math.min(speed, MAX_FLING) / -Math.log(DRAG_DECAY);
}

/** Ease for the return leg — decelerating, so it settles rather than arrives. */
export function easeReturn(t: number): number {
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return 1 - Math.pow(1 - c, 3);
}
