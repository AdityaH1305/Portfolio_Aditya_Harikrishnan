/* ══════════════════════════════════════════════════════
   404, built out of cubes, bouncing like a DVD logo

   Thirty cubes fly in from beyond every edge of the frame, assemble into the
   digits `404`, and the assembled word drifts across the viewport reflecting
   off all four walls.

   ── Same split, fifth time ──
   `SkillOrbit` has `layout.ts` beside `engine.ts`; `SignalGate` has
   `cubes.ts`/`forces.ts`/`finale.ts`; `GlyphA` has `glyph.ts`; `ZoneTitle` has
   `word.ts`. Every decision lives here and is provable in node; the `.tsx`
   owns a canvas and a ticker and nothing else.

   It matters more here than anywhere else in the repo, because the bounce is
   a SIMULATION. Simulations fail the way `forces.test.ts` documents — subtly,
   over minutes, in ways only a frame-by-frame run catches — and none of it is
   watchable in the dev environment, where the browser pane never composites
   and rAF never runs.

   ── Why this is not `word.ts` with a different string ──
   `word.ts` is a singleton around `WORD = "PROJECTS"`: `WORD_COLS`,
   `WORD_CELLS`, `WORD_FRAC` and `pitchFor` are all module constants derived
   from it, and its 372-line test asserts against every one of them —
   `WORD_CELLS.length >= 60` alone fails instantly for a 30-cube word. It also
   imports `LivingArchitecture/config.ts` and `stages.ts` at module scope for
   `atlasSources`, which would drag the whole atlas into this page's chunk and
   into this test's graph for a page that has no atlas on it.

   Nothing is imported from it. The shared kernel is `SignalGate/cubes.ts` —
   `CUBE_VERTS`, `CUBE_FACES`, `project`, `nearness`, `NEAR`, `FOV`, `Pose` —
   and that is enough.
   ══════════════════════════════════════════════════════ */

import { FOV, NEAR, type Pose } from "../SignalGate/cubes.ts";

/* ── The face ──────────────────────────────────────────

   3x5, the same metrics `word.ts` uses.

   `0` IS BYTE-IDENTICAL TO A CAPITAL `O` AT THIS RESOLUTION, and it cannot be
   anything else: three columns leaves exactly one interior column, and a
   slash, a dot or a squared counter all need either a 2-wide interior or a
   2-tall gap that 3x5 does not have. Filling the centre cell turns row 2 into
   `###` and the glyph reads as `8`.

   That is accepted rather than engineered around, for three reasons: both
   neighbours are unmistakably `4`, the page's real `<h1>` says "This page
   does not exist" in words, and the URL bar already said 404. The cubes carry
   no information the page depends on.

   It is also the reason these digits are NOT added to `word.ts`'s `GLYPHS`.
   Sharing one map would put `0` and `O` in it with identical art, and
   `word.test.ts:90` asserts distinct characters have distinct shapes — so the
   day someone writes a word containing both, a test fires in a module nobody
   touched. A test below pins the identity as deliberate. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "0": ["###", "#.#", "#.#", "#.#", "###"],
};

export const WORD = "404";
export const GLYPH_COLS = 3;
export const WORD_ROWS = 5;
/** One empty column between glyphs. Two reads as word-spacing inside a word. */
export const LETTER_GAP = 1;

/** 3*3 + 2*1 = 11. The gap columns count, and the pitch divides by this. */
export const WORD_COLS =
    WORD.length * GLYPH_COLS + (WORD.length - 1) * LETTER_GAP;

export interface Cell {
    readonly cx: number;
    readonly cy: number;
    /** Index into WORD. Only used to key the stagger; see `localProgress`. */
    readonly glyph: number;
}

export const DIGIT_CELLS: readonly Cell[] = (() => {
    const out: Cell[] = [];
    for (let g = 0; g < WORD.length; g++) {
        const art = GLYPHS[WORD[g]];
        if (!art) throw new Error(`no glyph for "${WORD[g]}"`);
        const originX = g * (GLYPH_COLS + LETTER_GAP);
        for (let cy = 0; cy < art.length; cy++) {
            for (let cx = 0; cx < art[cy].length; cx++) {
                if (art[cy][cx] === "#") {
                    out.push({ cx: originX + cx, cy, glyph: g });
                }
            }
        }
    }
    return out;
})();

/* ── Size ──────────────────────────────────────────────

   THE PITCH IS SOLVED FROM THE SHORT EDGE, NOT FROM WIDTH, and that is the
   one place this departs from `word.ts` on purpose.

   `word.ts` measures its fraction against viewport WIDTH so the title tracks
   the content column beside it. Correct for a title, wrong twice for an
   object that moves: a width-relative word is tiny on a portrait phone, and
   on a short landscape viewport its HEIGHT is governed by the long edge and
   can exceed the screen — at which point the bounce degenerates.

   Measuring against `min(w, h)` — which is exactly what `project()` scales by
   — makes the `w / min(w,h)` correction drop out of the arithmetic entirely.

   ── The identity worth knowing before tuning anything ──
   Substituting the whole chain, `z` and `min(w,h)` CANCEL:

       screenRadius = FILL * FRAC * min(w,h) / (WORD_COLS - 1)

   So `DIGITS_Z` is a pure brightness knob with NO effect on size. That is
   invisible in the source and it is what licenses tuning the depth for
   contrast without re-solving the layout. A test asserts it. */

/** Ink width as a fraction of the short edge, before the cube radius. */
export const DIGITS_FRAC = 0.38;

/** Cube edge as a fraction of the pitch. Between word.ts's 0.46 and glyph.ts's 0.52. */
export const FILL = 0.5;

/** Depth. `nearness(4.6)` is exactly 0.5 — see the fill alpha below. */
export const DIGITS_Z = 4.6;

export function pitchFor(z: number = DIGITS_Z): number {
    return (DIGITS_FRAC * z) / ((WORD_COLS - 1) * FOV);
}

export function cellSizeFor(z: number = DIGITS_Z): number {
    return pitchFor(z) * FILL;
}

/** Apparent half-width of one cube, in CSS px. Independent of `z`. */
export function cellScreenRadius(w: number, h: number, z: number = DIGITS_Z): number {
    return (cellSizeFor(z) * Math.min(w, h) * FOV) / z;
}

/* The INK box, not the grid box — the span between outermost cube CENTRES
   plus one radius on every side. `word.ts` had to correct this after the fact
   and records why; here it is load-bearing from the start, because this box
   IS the bounce's collision box. Report the grid span instead and the word
   clips the frame by one cube radius on every single bounce. */
export function inkWidth(w: number, h: number): number {
    return (
        (WORD_COLS - 1) * pitchFor() * ((Math.min(w, h) * FOV) / DIGITS_Z) +
        2 * cellScreenRadius(w, h)
    );
}

export function inkHeight(w: number, h: number): number {
    return (
        (WORD_ROWS - 1) * pitchFor() * ((Math.min(w, h) * FOV) / DIGITS_Z) +
        2 * cellScreenRadius(w, h)
    );
}

export interface Vec2 {
    readonly x: number;
    readonly y: number;
}

/** World-space position of a screen point at a given depth. */
export function anchorWorld(
    sx: number,
    sy: number,
    z: number,
    w: number,
    h: number,
): Vec2 {
    const k = z / (Math.min(w, h) * FOV);
    return { x: (sx - w / 2) * k, y: (h / 2 - sy) * k };
}

/** Screen position of a pose's centre. */
export function screenOf(pose: Pose, w: number, h: number): Vec2 {
    const scale = (Math.min(w, h) * FOV) / pose.z;
    return { x: w / 2 + pose.x * scale, y: h / 2 - pose.y * scale };
}

export function screenRadius(pose: Pose, w: number, h: number): number {
    return (pose.size * Math.min(w, h) * FOV) / pose.z;
}

/**
 * Where cell `i` sits when the word's ink centre is at `anchor`.
 *
 * NO ROTATION, like `word.ts`. And here that pays a dividend the title never
 * got: with `rx = ry = 0` the projection still shows a cube's sidewalls
 * whenever it is off the canvas centre, so a word that crosses the whole
 * viewport reveals its own solidity continuously — right sidewalls at the
 * left wall, left sidewalls at the right. A yaw would fight that.
 */
export function slotPose(
    i: number,
    anchor: Vec2,
    z: number = DIGITS_Z,
): Pose {
    const c = DIGIT_CELLS[i];
    const pitch = pitchFor(z);

    return {
        x: anchor.x + (c.cx - (WORD_COLS - 1) / 2) * pitch,
        // Art rows run top-down; world Y runs up.
        y: anchor.y + ((WORD_ROWS - 1) / 2 - c.cy) * pitch,
        z,
        rx: 0,
        ry: 0,
        size: cellSizeFor(z),
    };
}

/* ── The arrival ───────────────────────────────────────

   There is no atlas on this page, so there is nowhere for the cubes to come
   OUT of. The only structure available is the viewport itself, and
   `arrival.ts` already solved "off screen at every angle and every aspect
   ratio" for the entrance. Its reasoning is reused; none of its `Cube`-typed
   code is.

   SOLVED IN NORMALISED SPACE — x over w/2, y over h/2 — so the viewport is
   the unit square and the start radius is a multiple of its sqrt(2) corner.
   `arrival.ts` records what a circle in raw pixels costs: in a 16:9 frame it
   is nowhere near the top and bottom and barely past the sides, so a cube
   drifting in vertically spends most of its flight outside the frame while a
   horizontal one is already home.

   BY GOLDEN ANGLE ON THE INDEX, not on the cell's own bearing.
   `arrival.ts` can seed each block from its resting angle because its field
   is a ring. These slots are a wide, short bar clustered near the centre, so
   bearing-seeding would send 28 of 30 cubes in along one narrow horizontal
   band. A golden-angle sequence is low-discrepancy (no clumping), puts
   adjacent cubes in the word on opposite sides of the frame, and is
   deterministic — no `Math.random`, so the test can assert exact positions
   and there is no hydration surface. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * How far out a cube starts, as a multiple of the viewport's corner.
 *
 * 1.08, where `arrival.ts` uses 1.15. Smoothstep starts slow, so wasted
 * off-screen travel costs more here than it did there. `sqrt(2) * 1.08` is
 * 1.527 against the corner's 1.414 — a margin of 81px at 1440 wide and 21px
 * at 375, against cube radii of 17.1px and 7.1px. A test walks every cell at
 * every viewport and asserts each starts fully outside the frame.
 */
export const START_REACH = 1.08;

export function seedScreen(i: number, w: number, h: number): Vec2 {
    const th = i * GOLDEN_ANGLE;
    const r = Math.SQRT2 * START_REACH;
    return {
        x: w / 2 + Math.cos(th) * r * (w / 2),
        y: h / 2 + Math.sin(th) * r * (h / 2),
    };
}

/**
 * Smoothstep, and NOT `easeOut`.
 *
 * `arrival.ts` uses `easeOut` because it is a physics field settling. This is
 * an assembly into TYPE, which is `word.ts`'s case — and `word.test.ts`
 * measured the difference: a cubic ease reaches 3.0x its own average slope at
 * the midpoint and reads as a snap, smoothstep peaks at 1.5x. Same endpoints,
 * half the peak rate.
 *
 * Declared here rather than imported from `word.ts` only because importing it
 * would drag the atlas into this module's graph. The duplication is pinned by
 * a test asserting the two agree mathematically.
 */
export function settle(t: number): number {
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return c * c * (3 - 2 * c);
}

/* Timings, in ms from mount. `ASSEMBLE_TOTAL` is derived so the draw loop
   follows whatever the three above say. */
export const ASSEMBLE_DELAY = 200;
export const ASSEMBLE_STAGGER = 500;
export const ASSEMBLE_MS = 1400;
export const ASSEMBLE_TOTAL =
    ASSEMBLE_DELAY + ASSEMBLE_STAGGER + ASSEMBLE_MS;

/**
 * A cube has to be solid BEFORE it is inside the frame, or "floats in from
 * outside the screen" becomes "materialises just inside it".
 *
 * 0.06, `arrival.ts`'s number and its lesson — at 0.15 a block was still at
 * 94% opacity and already on screen. Asserted, not assumed.
 */
export const FADE_IN = 0.06;

/**
 * Per-cube progress at global progress `u`, staggered by COLUMN.
 *
 * By column and not by glyph: `word.ts` staggers by glyph because it has
 * eight of them, and three glyphs would give a coarse three-step pop. Eleven
 * columns sweeps left to right.
 */
export function localProgress(u: number, cx: number): number {
    const span = 1 - ASSEMBLE_STAGGER / (ASSEMBLE_STAGGER + ASSEMBLE_MS);
    const lead = (cx / (WORD_COLS - 1)) * (1 - span);
    const t = (u - lead) / span;
    return t < 0 ? 0 : t > 1 ? 1 : t;
}

export interface Drawn {
    readonly pose: Pose;
    readonly alpha: number;
}

/** Cube `i` on its way in: from its seed to its slot. */
export function arriveAt(
    i: number,
    slot: Pose,
    seed: Vec2,
    u: number,
    w: number,
    h: number,
): Drawn {
    const e = settle(u);
    const from = anchorWorld(seed.x, seed.y, slot.z, w, h);

    return {
        pose: {
            x: from.x + (slot.x - from.x) * e,
            y: from.y + (slot.y - from.y) * e,
            z: slot.z,
            rx: 0,
            ry: 0,
            size: slot.size,
        },
        alpha: u <= 0 ? 0 : u >= FADE_IN ? 1 : u / FADE_IN,
    };
}

/* ── The bounce ────────────────────────────────────────

   DIRECTION IS A UNIT VECTOR AND SPEED IS DERIVED FROM THE VIEWPORT, rather
   than storing a velocity. Three things fall out for free:

     1. "Reflection conserves speed" is true BY CONSTRUCTION — the only
        operations on dx/dy are Math.abs and negation, so there is no
        tolerance to drift.
     2. A resize needs no velocity fix-up at all; the word simply moves at the
        new viewport's speed on the next frame.
     3. A degenerate axis can be handled by not INTEGRATING it, rather than by
        zeroing the stored direction — so the heading survives a 1x1 canvas
        and resumes when the viewport comes back. */
export interface Bounce {
    /** Ink-box centre, CSS px. */
    readonly x: number;
    readonly y: number;
    /** Unit direction. hypot(dx, dy) === 1, always. */
    readonly dx: number;
    readonly dy: number;
    /** ms of the last corner hit and last edge hit. Finite, never -Infinity. */
    readonly cornerAt: number;
    readonly edgeAt: number;
    /** 0 = x, 1 = y, -1 = none. Which axis the last edge hit was on. */
    readonly edgeAxis: number;
}

/** Speed as a fraction of the short edge, per second. ~99 px/s at 1440x900. */
export const SPEED_FRAC = 0.11;

/**
 * atan(1/phi) — the slope least well approximated by any rational.
 *
 * An axis-aligned start never reaches a corner at all; 45 degrees degenerates
 * into a short repeating diagonal on a square-ish viewport. This makes the
 * path maximally non-repeating at any aspect ratio, so the corner hit stays
 * genuinely rare and genuinely reachable. Deterministic rather than random:
 * every visitor sees the same designed path and the test can assert it.
 */
export const START_ANGLE = Math.atan(2 / (1 + Math.sqrt(5)));

/** The same clamp `forces.ts` and SkillOrbit's engine use. A test pins it. */
export const MAX_DT = 0.05;

export function speedFor(w: number, h: number): number {
    return SPEED_FRAC * Math.min(w, h);
}

/**
 * Upper-left, heading down-right, and clear of the copy column — which is
 * also where the reduced-motion still frame draws.
 */
export function initialBounce(w: number, h: number): Bounce {
    return {
        x: 0.25 * w,
        y: 0.22 * h,
        dx: Math.cos(START_ANGLE),
        dy: Math.sin(START_ANGLE),
        cornerAt: -1e9,
        edgeAt: -1e9,
        edgeAxis: -1,
    };
}

export const CORNER_MS = 700;
/** Both axes reflecting within this counts as a corner. ~32px of travel. */
export const CORNER_WINDOW_MS = 320;
/** Peak multiplier on drawn alpha at the instant of a corner hit. */
export const CORNER_LIFT = 0.45;

export function cornerLift(s: Bounce, now: number): number {
    const u = (now - s.cornerAt) / CORNER_MS;
    if (u < 0 || u >= 1) return 0;
    return 1 - u * u * (3 - 2 * u);
}

export function alphaScale(lift: number): number {
    return 1 + CORNER_LIFT * lift;
}

/**
 * One step of the bounce.
 *
 * Three details, each preventing a specific bug that only shows up later:
 *
 *   `Math.abs(dx)` / `-Math.abs(dx)`, NEVER `dx = -dx`. The reflection is
 *   then IDEMPOTENT — if a large dt, a resize or a float edge case fires the
 *   same branch twice, the word cannot un-reflect itself and sit vibrating
 *   against the wall. This is the most important line in the file.
 *
 *   The position is MIRRORED, not just clamped. `x = loX + (loX - x)` puts
 *   the word where it would have been had it reflected mid-step, so the
 *   motion is continuous; clamping alone stalls it on the wall for a frame,
 *   which is visible as a stutter at every bounce.
 *
 *   A hard clamp AFTER the mirror, for an overshoot exceeding the whole span
 *   (a huge dt before clamping, or a resize to a sliver). Without it the
 *   mirror lands outside the OPPOSITE wall and the next frame reflects again
 *   — jitter that only appears after a tab has been backgrounded, which is
 *   exactly the class of bug that ships.
 */
export function stepBounce(
    s: Bounce,
    dt: number,
    w: number,
    h: number,
    now: number,
): Bounce {
    const step = dt > 0 ? (dt > MAX_DT ? MAX_DT : dt) : 0;
    const v = speedFor(w, h) * step;

    const hw = inkWidth(w, h) / 2;
    const hh = inkHeight(w, h) / 2;
    const loX = hw;
    const hiX = w - hw;
    const loY = hh;
    const hiY = h - hh;

    let x = s.x + s.dx * v;
    let dx = s.dx;
    let hitX = false;
    if (hiX <= loX) {
        x = w / 2;
    } else {
        if (x < loX) {
            x = loX + (loX - x);
            dx = Math.abs(dx);
            hitX = true;
        } else if (x > hiX) {
            x = hiX - (x - hiX);
            dx = -Math.abs(dx);
            hitX = true;
        }
        if (x < loX) x = loX;
        else if (x > hiX) x = hiX;
    }

    let y = s.y + s.dy * v;
    let dy = s.dy;
    let hitY = false;
    if (hiY <= loY) {
        y = h / 2;
    } else {
        if (y < loY) {
            y = loY + (loY - y);
            dy = Math.abs(dy);
            hitY = true;
        } else if (y > hiY) {
            y = hiY - (y - hiY);
            dy = -Math.abs(dy);
            hitY = true;
        }
        if (y < loY) y = loY;
        else if (y > hiY) y = hiY;
    }

    let { cornerAt, edgeAt, edgeAxis } = s;
    if (hitX || hitY) {
        const axis = hitX && hitY ? 2 : hitX ? 0 : 1;
        const both =
            (hitX && hitY) ||
            (edgeAxis !== -1 &&
                edgeAxis !== axis &&
                now - edgeAt <= CORNER_WINDOW_MS);
        if (both) cornerAt = now;
        edgeAt = now;
        edgeAxis = axis === 2 ? 0 : axis;
    }

    return { x, y, dx, dy, cornerAt, edgeAt, edgeAxis };
}

/**
 * Remap the position through a viewport change, by FRACTION of the free span
 * rather than by absolute pixels.
 *
 * Absolute pixels would strand a word that was near the right edge outside a
 * narrowed viewport, and the step's clamp would then snap it to the wall — a
 * visible teleport. The fractional map means a window drag slides the word
 * proportionally and it is never out of bounds for a single frame. Direction
 * and speed need no attention at all; see the `Bounce` note.
 */
export function rescaleBounce(
    s: Bounce,
    oldW: number,
    oldH: number,
    w: number,
    h: number,
): Bounce {
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

    const oldHw = inkWidth(oldW, oldH) / 2;
    const oldHh = inkHeight(oldW, oldH) / 2;
    const oldSpanX = oldW - 2 * oldHw;
    const oldSpanY = oldH - 2 * oldHh;

    const fx = oldSpanX > 0 ? clamp01((s.x - oldHw) / oldSpanX) : 0.5;
    const fy = oldSpanY > 0 ? clamp01((s.y - oldHh) / oldSpanY) : 0.5;

    const hw = inkWidth(w, h) / 2;
    const hh = inkHeight(w, h) / 2;
    const spanX = w - 2 * hw;
    const spanY = h - 2 * hh;

    return {
        ...s,
        x: spanX > 0 ? hw + fx * spanX : w / 2,
        y: spanY > 0 ? hh + fy * spanY : h / 2,
    };
}

/* ── Colour ────────────────────────────────────────────

   THE ALPHAS ARE PART OF A CONTRAST MEASUREMENT, not a look. See the render
   rule in NotFoundCubes.tsx: only the NEAREST face is filled, and these
   numbers are solved against that. Stacking six fills the way ZoneTitle does
   composites to 0.872 coverage and drives body text to 3.55:1 — a WCAG
   failure — because at this pitch the far face projects at 96.75% of the near
   one and they overlap over ~94% of their area.

   One fill at these values, at the corner lift's peak, measures 6.51:1. A
   test asserts it. */
export const FILL_BASE = 0.14;
export const FILL_NEAR = 0.3;
export const STROKE_BASE = 0.18;
export const STROKE_NEAR = 0.34;
