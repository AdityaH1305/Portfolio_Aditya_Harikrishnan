/* ══════════════════════════════════════════════════════
   The loading ring

   Between the press and the gather, the six blocks sweep out of the physics
   field and into a slowly turning ring. Real work happens while it turns —
   see `lib/preloadAssets.ts` — and each segment lights as that work lands.
   When it is done the ring collapses into the merged cube and bursts exactly
   as it did before.

   ── THIS IS NOT THE BOOT READOUT COMING BACK ──
   The gate used to open on seven log lines and a green "ALL SYSTEMS
   OPERATIONAL" banner. `bootSequence()` was deleted, and `gate.ts` records
   why in as many words: "They were a LOADING SCREEN, and the screen they
   interrupted was not loading anything."

   Both halves of that objection are answered here rather than dodged. It was
   FAKE — this one is not; the ring cannot reach full until the imports it is
   waiting on have actually settled. And it was WORDS narrating a transition —
   this is one number and six lit segments, with the choreography still
   carrying the state.

   The trap that does still apply is the other one, from the CSS: "a
   cross-fade is exactly the kind of seam a reader reads as 'loading finished'
   rather than as one shot." Which is why the ring does not fade out and
   something else fade in. Its final positions ARE the poses the gather
   collapses, so the two are one continuous movement with no boundary to see.

   ── Pure, and that is the whole point ──
   Fifth module in the row beside `cubes.ts`, `forces.ts`, `finale.ts` and
   `arrival.ts`. No DOM, no GSAP, so the geometry and the progress curve are
   provable in node — which matters more than usual because the dev browser
   pane never composites and none of this is watchable there.
   ══════════════════════════════════════════════════════ */

import { FOV, NEAR, type Pose } from "./cubes.ts";
import { easeInOut } from "./finale.ts";

/* ── The formation ─────────────────────────────────────

   Depth sits between the field's own range and `MERGE_Z` (3.4), so the ring
   reads as the blocks having already begun their journey inward — the gather
   then continues a movement rather than starting a new one. */
export const RING_Z = 4.1;

/**
 * Ring radius in world units, at `RING_Z`.
 *
 * 0.8, not 0.95. At the larger value the formation spanned 70% of a 900px
 * viewport's height, which left the percentage beneath it nowhere to sit
 * without collision. Measured at this radius the ring's lowest point clears
 * the readout at every viewport from 320x568 up — the test asserts it.
 */
export const RING_RADIUS = 0.8;

/**
 * Half-extent of a block on the ring.
 *
 * Deliberately larger than a field block (`SIZE_MIN` 0.14 … `SIZE_MAX` 0.26)
 * and far smaller than the merged cube (`MERGE_SIZE` 0.62). The ring is the
 * middle state of a single continuous shrink-and-gather, so its size has to
 * sit between the two ends or the collapse changes direction halfway.
 */
export const RING_SIZE = 0.3;

/** Radians per second the whole ring turns. One revolution ≈ 7.9s. */
export const SPIN_RATE = 0.8;

/** Radians per second each block turns on its own axes, while on the ring. */
export const TUMBLE_RX = 0.5;
export const TUMBLE_RY = 0.75;

/* ── The schedule, in ms from the press ────────────────

   `FORM_AT` is `CONVERGE_AT`'s number and `CONVERGE_AT`'s reasoning: it
   starts BEFORE the copy has finished leaving (`EXIT_MS` is 420), because
   text out *then* cubes in reads as two steps while an overlap reads as one
   gesture. `gate.test.ts` asserts that relationship for the gather; the same
   argument applies here and the same number serves it. */
export const FORM_AT = 180;

/** How long a block takes to travel from the field into its ring slot. */
export const FORM_MS = 700;

/**
 * The floor.
 *
 * On a warm cache the three imports settle in ~100–300ms. Without a minimum
 * the ring would appear and vanish inside a quarter of a second, which reads
 * as a glitch rather than as a beat — and worse, it would read as the site
 * having lied about doing anything. Measured from the press, so the morph is
 * inside it rather than added to it.
 */
export const MIN_HOLD_MS = 900;

/**
 * The ceiling.
 *
 * A hung request must never be able to trap somebody on the entrance. At this
 * point the loader gives up and continues to the site regardless of what has
 * or has not arrived — the same "degrade, never block" posture the two
 * existing image loaders in this codebase take.
 */
export const MAX_WAIT_MS = 6000;

/* ── Geometry ──────────────────────────────────────────

   `w`/`h` are accepted but deliberately unused: every other pose producer in
   this family takes them, `project()` scales by `min(w, h)` itself, and a
   ring expressed in world units is already viewport-independent. Taking them
   keeps the call sites uniform and leaves the door open for a
   breakpoint-dependent radius without changing every caller. */
export function ringPose(
    i: number,
    n: number,
    t: number,
    _w?: number,
    _h?: number,
): Pose {
    const a = (i / n) * Math.PI * 2 + t * SPIN_RATE;

    return {
        x: Math.cos(a) * RING_RADIUS,
        y: Math.sin(a) * RING_RADIUS,
        z: RING_Z,
        /* Unbounded in `t`, exactly like the field's own rotation. That is
           safe because `convergeAt` runs both angles through `nearestTurn`
           before interpolating — the immunisation `finale.ts` added after the
           merge started looking different depending on how long somebody had
           sat on the entrance. A long load is the same hazard and is already
           covered. Do not "fix" this by wrapping it here. */
        rx: t * TUMBLE_RX,
        ry: t * TUMBLE_RY,
        size: RING_SIZE,
    };
}

/**
 * A block on its way from the physics field into its ring slot.
 *
 * `formAt(from, ring, 0)` RETURNS `from` EXACTLY, and that is a contract
 * rather than a nicety: the physics runs right up to `FORM_AT` and the first
 * morph frame has to draw what the last physics frame would have, or all six
 * blocks visibly jump at the moment of the press. `convergeAt` carries the
 * identical guarantee at the other seam for the identical reason, and both
 * are asserted.
 */
export function formAt(from: Pose, ring: Pose, u: number): Pose {
    const e = easeInOut(u);
    const mix = (a: number, b: number) => a + (b - a) * e;

    return {
        x: mix(from.x, ring.x),
        y: mix(from.y, ring.y),
        z: mix(from.z, ring.z),
        rx: mix(from.rx, ring.rx),
        ry: mix(from.ry, ring.ry),
        size: mix(from.size, ring.size),
    };
}

/* ── The ring as a progress meter ──────────────────────

   Each block owns one slice of the bar. Below its slice it sits at
   `DIM`; across its slice it lifts to full; above, it stays lit. So the ring
   fills like a segmented gauge rather than every block brightening at once,
   which is what makes it read as *progress* and not merely as *activity*.

   `DIM` is not zero. A block that has not been reached yet is still a block
   on the ring — dropping it to nothing would make the formation appear to
   assemble itself out of order as loading advanced. */
export const DIM = 0.34;

/** Fraction of a segment's slice spent ramping, rather than snapping. */
const RAMP = 0.55;

export function segmentAlpha(i: number, n: number, progress: number): number {
    const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const slice = 1 / n;
    const local = (p - i * slice) / (slice * RAMP);
    const lit = local < 0 ? 0 : local > 1 ? 1 : local;
    return DIM + (1 - DIM) * lit;
}

/**
 * What the reader is actually shown.
 *
 * Three jobs, and each exists because of a specific way the honest number
 * looks wrong on screen:
 *
 *   MONOTONE. `Promise.allSettled` reports completions in whatever order they
 *   land; a bar that ever ticks backwards reads as broken even when the
 *   underlying number is correct.
 *
 *   FLOORED BY TIME. Real progress can hit 1 in 120ms on a warm cache. The
 *   displayed value is capped by elapsed/MIN_HOLD_MS so it always takes the
 *   full beat to cross, which is what stops the whole loader flashing past.
 *
 *   NEVER STALLED AT ZERO. With three tasks, nothing at all moves until the
 *   first settles. The floor keeps the number climbing from the first frame,
 *   so the ring is alive before it has anything to report.
 *
 * It reaches exactly 1 only when the work is genuinely done AND the beat has
 * been served — which is the condition the caller then uses to hand over.
 */
export function displayProgress(real: number, elapsedMs: number): number {
    const r = real < 0 ? 0 : real > 1 ? 1 : real;
    const paced = elapsedMs <= 0 ? 0 : Math.min(1, elapsedMs / MIN_HOLD_MS);
    return Math.min(r, paced);
}

/** Whether the loader has earned its handover: work done and beat served. */
export function readyToMerge(real: number, elapsedMs: number): boolean {
    return real >= 1 && elapsedMs >= MIN_HOLD_MS;
}

/**
 * Apparent half-width of a ring block, in CSS px.
 *
 * Only used by the tests, to prove the ring fits on the narrowest viewport
 * and never crosses the camera. Mirrors `project()`'s own scale term.
 */
export function ringScreenRadius(w: number, h: number): number {
    return (RING_SIZE * Math.min(w, h) * FOV) / RING_Z;
}

/** Apparent radius of the ring itself, centre to block centre, in CSS px. */
export function ringScreenSpan(w: number, h: number): number {
    return (RING_RADIUS * Math.min(w, h) * FOV) / RING_Z;
}

/** The closest any part of a ring block gets to the camera. */
export function ringNearestZ(): number {
    /* The ring is flat in z, so the only thing that reaches toward the camera
       is a corner of a turning block: at most `size * sqrt(3)`. */
    return RING_Z - RING_SIZE * Math.sqrt(3);
}

/** Sanity constant for the tests — the camera plane blocks must clear. */
export const CAMERA_FLOOR = NEAR * 0.9;
