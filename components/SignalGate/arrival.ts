/* ══════════════════════════════════════════════════════
   The blocks arriving

   For a while the six blocks simply existed. `spawnField`
   placed them and the first frame the canvas got drew them
   at full strength — and that frame waits on hydration and
   on a dynamic chunk, so they appeared at an unpredictable
   moment and always as a hard cut. The first thing anybody
   sees on this site popped into being.

   So now the room is empty for half a second, and then they
   sweep in from beyond the edges of the screen and settle
   into exactly the places the physics is expecting.

   ── Why this is its own module ──
   Fourth in the row beside `cubes.ts`, `forces.ts` and
   `finale.ts`, for the same reason as all three: the
   choreography is arithmetic, node can check it frame by
   frame, and none of it is watchable in the dev environment
   — the browser pane never composites, so rAF never runs.

   ── Measured from MOUNT, not from page load ──
   "Half a second after the page loads" is not a thing this
   can promise: if hydration takes 900ms then the moment has
   already gone and we are back to a cut. The clock starts
   when the field exists, so the beat is always the same
   length and the arrival can never be skipped — which was
   the actual complaint.
   ══════════════════════════════════════════════════════ */

import type { Cube } from "./cubes.ts";
import { easeOut } from "./finale.ts";

/** The room, empty, before anything moves. */
export const ARRIVE_DELAY = 500;

/** Spread between the first block leaving and the last. */
export const ARRIVE_STAGGER = 400;

/** One block's flight. */
export const ARRIVE_MS = 1100;

/** When the last block has landed and the physics takes over. Derived — the
    draw loop keys off this and follows whatever the three above say. */
export const ARRIVE_TOTAL = ARRIVE_DELAY + ARRIVE_STAGGER + ARRIVE_MS;

/**
 * How far out a block starts, as a multiple of the viewport's own corner.
 *
 * THE WHOLE ARRIVAL IS SOLVED IN NORMALISED SPACE — x over `halfX`, y over
 * `halfY` — so the viewport is the unit square and its corner is at `sqrt(2)`.
 * Anything past that radius is outside the frame at every angle and every
 * aspect ratio, which is the guarantee, and one constant covers a phone and an
 * ultrawide.
 *
 * It was a circle in raw physics units first, and the stills caught what that
 * costs. A circle in a 16:9 frame is nowhere near the edge at the top and
 * bottom and only just past it at the sides, so a block drifting in vertically
 * spent most of its flight outside the frame while a horizontal one was
 * already home. Same clock, visibly different arrivals, and a first second
 * that looked emptier than it was meant to.
 *
 * Only slightly past the corner on purpose: every extra bit of reach is travel
 * the reader cannot see, spent before the block enters the frame.
 */
const START_REACH = 1.15;

/**
 * How far ahead of its resting angle a block starts, in radians.
 *
 * THIS IS THE WHOLE DIFFERENCE BETWEEN A DRIFT AND A SLIDE. Interpolating the
 * radius alone sends every block down a straight line to its mark, six objects
 * on rails; sweeping the angle as well curves each path, and because the offset
 * is the same sign for all of them the field turns into place as one gesture
 * rather than six.
 *
 * Small on purpose. A large sweep is a carousel, and it also erodes the
 * guarantee below — the angle has to be near enough to correct by the time the
 * radius is small that the path cannot cut across the copy.
 */
const SWEEP = 0.45;

/**
 * Fraction of a block's flight spent fading up.
 *
 * INSURANCE, NOT AN EFFECT — it has to be finished before the block is inside
 * the frame, or "floats in from outside the screen" becomes "materialises just
 * inside it". With the start only slightly past the corner a block crosses in
 * about a tenth of its flight, so this has to be shorter than that, and it is
 * short enough that nobody will ever see it run.
 *
 * At 0.15 the test below caught exactly this: a block was still at 94% opacity
 * 156ms in, already on screen. The number is not free to pick — `a block is
 * solid before it is on screen` is what actually bounds it.
 */
const FADE_IN = 0.06;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Where a block is, and how solid, part way through the arrival. */
export interface Drift {
    /** Physics-space position — the same units `Cube.x` / `Cube.y` are in. */
    readonly x: number;
    readonly y: number;
    /** 0…1. */
    readonly alpha: number;
}

/**
 * When block `i` of `n` starts moving, in ms since mount.
 *
 * STAGGERED BY INDEX, WHICH IS AN ANGULAR SWEEP. `spawnField` deals blocks one
 * angular slice each around the keep-out ellipse, so index order walks the
 * arrival around the ring — the field fills in like a hand sweeping a dial
 * rather than six things showing up in an arbitrary order. It costs nothing;
 * it is just which number the stagger is keyed to.
 */
export function departureOf(i: number, n: number): number {
    return ARRIVE_DELAY + (n > 1 ? (i / (n - 1)) * ARRIVE_STAGGER : 0);
}

/**
 * Where block `i` is at `ms` since mount.
 *
 * `env` only needs the viewport half-extents, which is what `envFor` in
 * `cubes.ts` already returns.
 *
 * AT THE END THIS RETURNS THE RESTING POSITION VERBATIM, not the same position
 * recomputed. Going out to polar and back is exact in real arithmetic and
 * merely very close in floating point, and "very close" is what makes a block
 * twitch on the first physics frame — the same failure `convergeAt(from, 0)`
 * returning `from` exists to prevent one module over.
 */
export function arriveAt(
    cube: Cube,
    i: number,
    n: number,
    ms: number,
    env: { readonly halfX: number; readonly halfY: number },
): Drift {
    const u = clamp01((ms - departureOf(i, n)) / ARRIVE_MS);
    if (u >= 1) return { x: cube.restX, y: cube.restY, alpha: 1 };

    /* Normalised: the viewport becomes the unit square, so a radius and an
       angle mean the same thing at every aspect ratio. Denormalised again on
       the way out. */
    const nx = cube.restX / env.halfX;
    const ny = cube.restY / env.halfY;
    const restR = Math.hypot(nx, ny);
    const restA = Math.atan2(ny, nx);
    const startR = Math.SQRT2 * START_REACH;

    /* Decelerating. Fast across the edge, settling into place — a linear
       arrival reads as a diagram of one. */
    const e = easeOut(u);
    const r = startR + (restR - startR) * e;
    const a = restA + SWEEP * (1 - e);

    return {
        x: Math.cos(a) * r * env.halfX,
        y: Math.sin(a) * r * env.halfY,
        alpha: clamp01(u / FADE_IN),
    };
}
