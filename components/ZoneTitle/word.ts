/* ══════════════════════════════════════════════════════
   PROJECTS, built out of the atlas

   The entrance's cubes flew into a letter and dissolved
   into the atlas at the hero. This is the other end of that
   idea: at `#work` a handful come back OUT of the diagram,
   assemble into the section's title, and fall back into it
   as the reader scrolls on.

   ── Same split, third time ──
   `SkillOrbit` has `layout.ts` beside `engine.ts`;
   `SignalGate` has `cubes.ts`/`forces.ts`/`finale.ts` beside
   the `.tsx`; `GlyphA` has `glyph.ts`. The rules are
   arithmetic and provable in node; the component is left
   holding a canvas and a ticker. It matters more than usual
   here because nothing on this page is watchable in the dev
   environment — the browser pane never composites, so rAF
   never runs.

   ── What it does NOT reuse from GlyphA, and why ──
   `flyAt` opens on `debrisAt(f, 0)`, the merged cube, and
   takes a `Fragment` from the entrance's one-shot handoff —
   which `GlyphA` has already consumed by the time this
   mounts. These cubes have a different origin story: they
   come out of the atlas, so they need a plain pose-to-pose
   travel, which is what `emergeAt` and `disperseAt` are.

   `slotPose` is forked rather than imported because
   `GlyphA`'s reads its letterform from module scope. The
   arithmetic there is already generic; only the coupling
   was not.
   ══════════════════════════════════════════════════════ */

import { FOV, NEAR, type Pose } from "../SignalGate/cubes.ts";
import { easeOut } from "../SignalGate/finale.ts";
import {
    CORE_POSITIONS,
    LENGTH_SCALE,
    type BreakpointMode,
} from "../LivingArchitecture/config.ts";
import { STAGES } from "../LivingArchitecture/stages.ts";

/* ── The face ──────────────────────────────────────────

   THREE COLUMNS, NOT FIVE, and that is the whole budget
   decision. `PROJECTS` at the A's own 5×8 metrics is 47
   columns and lands somewhere around 165–190 cubes. At 3×5
   it is 31 columns and 80 — which is what "a few tiny
   fragments, no clutter" actually costs.

   One column of space between letters. Two would read as
   word-spacing inside a single word; none runs the strokes
   together at this resolution. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
    P: ["###", "#.#", "###", "#..", "#.."],
    R: ["###", "#.#", "###", "#.#", "#.#"],
    O: ["###", "#.#", "#.#", "#.#", "###"],
    J: ["..#", "..#", "..#", "#.#", "###"],
    E: ["###", "#..", "###", "#..", "###"],
    C: ["###", "#..", "#..", "#..", "###"],
    T: ["###", ".#.", ".#.", ".#.", ".#."],
    S: ["###", "#..", "###", "..#", "###"],
};

export const WORD = "PROJECTS";
export const GLYPH_COLS = 3;
export const WORD_ROWS = 5;
/** One blank column between letters. */
export const LETTER_GAP = 1;

export const WORD_COLS =
    WORD.length * GLYPH_COLS + (WORD.length - 1) * LETTER_GAP;

export interface Cell {
    /** 0…WORD_COLS-1, left to right across the whole word. */
    readonly cx: number;
    /** 0…WORD_ROWS-1, TOP DOWN — art order, not world order. */
    readonly cy: number;
    /** Which letter it belongs to. Used to stagger the arrival. */
    readonly glyph: number;
}

/**
 * Every lit cell in the word.
 *
 * Around 80 of them. The count is asserted rather than written down, because
 * the only thing that should ever change it is the art above.
 */
export const WORD_CELLS: readonly Cell[] = (() => {
    const out: Cell[] = [];
    for (let g = 0; g < WORD.length; g++) {
        const art = GLYPHS[WORD[g]];
        if (!art) throw new Error(`no glyph for "${WORD[g]}"`);
        const originX = g * (GLYPH_COLS + LETTER_GAP);
        for (let cy = 0; cy < art.length; cy++) {
            for (let cx = 0; cx < art[cy].length; cx++) {
                if (art[cy][cx] !== "#") continue;
                out.push({ cx: originX + cx, cy, glyph: g });
            }
        }
    }
    return out;
})();

/* ── Scale ─────────────────────────────────────────────

   THE PITCH IS SOLVED FROM WIDTH, and that is the one piece of `glyph.ts`'s
   arithmetic that could not be carried over. Its `pitchFor` derives the pitch
   from the letter's HEIGHT — correct for a single 5-column glyph, where height
   is what binds. A 31-column word solved the same way comes out about six
   times the viewport across.

   Width is also why `min(w, h)` appears: the projection scales by the short
   edge, so a word measured as a fraction of the LONG edge has to divide it
   back out or it changes size with the aspect ratio rather than with the
   space it has. */

/** Word width as a fraction of the viewport width. */
export const WORD_FRAC = 0.28;

/** Depth the word stands at. */
export const WORD_Z = 4.2;

/** How much of a cell's pitch the cube fills. Tighter than the A's 0.52 — at
    this size the gaps are what keep the strokes from merging into slabs. */
const FILL = 0.46;

export function pitchFor(w: number, h: number, z: number = WORD_Z): number {
    return (WORD_FRAC * w * z) / ((WORD_COLS - 1) * Math.min(w, h) * FOV);
}

export function cellSizeFor(w: number, h: number, z: number = WORD_Z): number {
    return pitchFor(w, h, z) * FILL;
}

/* ── The word's INK box, in CSS pixels ─────────────────

   These exist so the heading the word stands in for can be given the same
   rectangle, and so the component can align it. Both were got wrong once and
   the corrections are worth keeping.

   FIRST: the box and the word were simply different sizes — 65px of word on a
   43px heading, overhanging ~11px top and bottom. Every margin around it was
   therefore lying, `mt-6` above reading as a 13px gap and `mt-5` below as 9px,
   which is why the header looked unbalanced for a reason no amount of tuning
   those margins could fix.

   SECOND, and subtler: the first correction measured centre-to-centre. A cube
   is not a point — it extends its own screen radius past the outermost centre
   on every side — so the box was still about 12px short in each axis and the
   word still overhung it by 6px. `+ 2 * cellScreenRadius` is the difference
   between "the grid spans this" and "the ink covers this", and only the
   second one is what a margin sits against.

   Derived from the same constants the poses are, so there is one source of
   truth rather than numbers retyped into the stylesheet. */

/** Apparent half-width of one cube, in CSS pixels. */
export function cellScreenRadius(
    w: number,
    h: number,
    z: number = WORD_Z,
): number {
    return (cellSizeFor(w, h, z) * Math.min(w, h) * FOV) / z;
}

/** Distance between the outermost cube CENTRES, horizontally. */
function centresWidth(w: number): number {
    return WORD_FRAC * w;
}

/** Distance between the outermost cube centres, vertically. */
function centresHeight(w: number): number {
    return ((WORD_ROWS - 1) * WORD_FRAC * w) / (WORD_COLS - 1);
}

/** Full width of the drawn word, edge to edge. */
export function wordScreenWidth(w: number, h: number): number {
    return centresWidth(w) + 2 * cellScreenRadius(w, h);
}

/** Full height of the drawn word, edge to edge. */
export function wordScreenHeight(w: number, h: number): number {
    return centresHeight(w) + 2 * cellScreenRadius(w, h);
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

/**
 * Where cell `i` sits when the word is anchored at `anchor`.
 *
 * No rotation. The A is an object you can turn; this is TYPE, and type that
 * tilts is a logo animation rather than a title. It is also 31 columns wide —
 * any yaw at all and the far end of the word is at a visibly different scale
 * from the near end.
 */
export function slotPose(
    i: number,
    anchor: Vec2,
    w: number,
    h: number,
    z: number = WORD_Z,
): Pose {
    const c = WORD_CELLS[i];
    const pitch = pitchFor(w, h, z);

    return {
        x: anchor.x + (c.cx - (WORD_COLS - 1) / 2) * pitch,
        // Art rows run top-down; world Y runs up.
        y: anchor.y + ((WORD_ROWS - 1) / 2 - c.cy) * pitch,
        z,
        rx: 0,
        ry: 0,
        size: cellSizeFor(w, h, z),
    };
}

/* ── Where they come from, and go back to ──────────────── */

/**
 * The atlas's own anchors at the `#work` stage: its core, plus stage 2's
 * branch endpoints.
 *
 * Derived from the atlas config rather than copied, so cubes cannot emerge
 * from points the diagram has stopped drawing. `STAGES[2]` because that is the
 * Visual Peak — the stage this section holds.
 *
 * `baseAngle` is the atlas's own convention: 0 is right, PI/2 is DOWN, so
 * these are screen coordinates and no Y flip belongs here.
 */
export function atlasSources(
    w: number,
    h: number,
    mode: BreakpointMode,
): Vec2[] {
    const core = CORE_POSITIONS[mode];
    const scale = LENGTH_SCALE[mode];
    const cx = core.x * w;
    const cy = core.y * h;
    const clamp = (v: number, lo: number, hi: number) =>
        v < lo ? lo : v > hi ? hi : v;

    return [
        { x: cx, y: cy },
        ...STAGES[2].branches.map((b) => ({
            x: clamp(cx + Math.cos(b.baseAngle) * b.length * scale, w * 0.04, w * 0.96),
            y: clamp(cy + Math.sin(b.baseAngle) * b.length * scale, h * 0.04, h * 0.96),
        })),
    ];
}

/** Which anchor cube `i` comes from. Round robin, so every source is used. */
export function sourceForCell(i: number, sourceCount: number): number {
    return i % sourceCount;
}

export interface Drawn {
    readonly pose: Pose;
    /** 0…1. */
    readonly alpha: number;
}

/** How small a cube is while still inside the atlas. */
const SEED_SIZE = 0.16;

/** Fraction of the arrival spent fading in. */
const FADE_IN = 0.35;

/** Fraction of the departure held at full opacity. */
const HOLD_OUT = 0.4;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The curve the cubes travel on — smoothstep, NOT the cubic `easeInOut` the
 * rest of the site uses.
 *
 * THE PROBLEM WAS PEAK SPEED, NOT DISTANCE. A cubic ease-in-out reaches a
 * slope of 3x its own average at the midpoint, so a letter spends most of its
 * window barely moving and then crosses the gap in a burst — which reads as a
 * snap however long the window is. Lengthening the scroll span cannot fix
 * that; it stretches the pauses and leaves the burst exactly as fast.
 *
 * Smoothstep peaks at 1.5x average, so the fastest instant is HALF what it
 * was for the same travel. That, rather than the span, is what turned this
 * from a snap into an assembly. `word.test.ts` asserts the ratio directly.
 *
 * Still exactly 0 at 0 and 1 at 1, so every landing-on-the-slot assertion is
 * untouched.
 */
export function settle(t: number): number {
    const c = clamp01(t);
    return c * c * (3 - 2 * c);
}

function lerpPose(from: Pose, to: Pose, e: number, size: number): Pose {
    const mix = (a: number, b: number) => a + (b - a) * e;
    return {
        x: mix(from.x, to.x),
        y: mix(from.y, to.y),
        // Clamped short of the camera plane. A cube that crosses it projects
        // to a wild coordinate and streaks a polygon across the whole title.
        z: Math.max(NEAR * 0.9, mix(from.z, to.z)),
        rx: mix(from.rx, to.rx),
        ry: mix(from.ry, to.ry),
        size,
    };
}

/**
 * The pose a cube holds while it is still inside the atlas: tiny, and AT the
 * anchor in world space.
 *
 * THE CONVERSION IS EXPLICIT BECAUSE IT HAS TO BE. `atlasSources` returns
 * screen pixels — it is derived from `CORE_POSITIONS`, which are viewport
 * fractions — and everything else here is in world units. Feeding one to the
 * other put the first frame 263,000px off the side of the screen, which the
 * test caught and which would have looked like the effect simply not
 * happening.
 */
export function seedPose(src: Vec2, slot: Pose, w: number, h: number): Pose {
    const world = anchorWorld(src.x, src.y, slot.z, w, h);
    return {
        x: world.x,
        y: world.y,
        z: slot.z,
        rx: 0,
        ry: 0,
        size: slot.size * SEED_SIZE,
    };
}

/**
 * A cube on its way out of the atlas and into the word.
 *
 * At `u = 1` the pose is EXACTLY `slot`. The word is type — a letter whose
 * cubes land a pixel or two out does not read as a rendering flourish, it
 * reads as a badly kerned font.
 *
 * Eased in and out, so a cube leaves the diagram gently rather than being
 * fired out of it, and settles rather than arriving at speed.
 */
export function emergeAt(from: Pose, slot: Pose, u: number): Drawn {
    const p = clamp01(u);
    const e = settle(p);
    return {
        pose: lerpPose(from, slot, e, from.size + (slot.size - from.size) * e),
        alpha: p >= FADE_IN ? 1 : easeOut(p / FADE_IN),
    };
}

/**
 * A cube falling back into the atlas as the reader scrolls on.
 *
 * The mirror of `emergeAt`, and deliberately so: they came out of the diagram
 * and they go back into it. Anything else leaves the word to simply stop
 * existing, which is what the burst used to do with the entrance's fragments
 * before there was anywhere for them to go.
 */
export function disperseAt(slot: Pose, to: Pose, p: number): Drawn {
    const c = clamp01(p);
    const e = settle(c);
    const fade = c <= HOLD_OUT ? 1 : 1 - (c - HOLD_OUT) / (1 - HOLD_OUT);
    return {
        pose: lerpPose(slot, to, e, slot.size + (to.size - slot.size) * e),
        alpha: clamp01(fade),
    };
}

/**
 * Per-letter stagger, 0…1 of the window.
 *
 * The word assembles left to right rather than all at once — eight letters
 * arriving on the same frame is a title that pops rather than one that is
 * built.
 *
 * It is ALSO a speed control, which is easy to miss: every letter gets only
 * `1 - STAGGER` of the window to move in, so the stagger is taken directly out
 * of each letter's travel time. At 0.28 a letter had 72% of an already-short
 * emerge; at 0.2 it has 80%, which is a free 11% slower for the same scroll
 * distance and still reads clearly left to right.
 */
export const STAGGER = 0.2;

export function localProgress(u: number, glyph: number): number {
    const lead = (glyph / Math.max(1, WORD.length - 1)) * STAGGER;
    return clamp01((u - lead) / (1 - STAGGER));
}

/** Screen point of a pose's centre. */
export function screenOf(pose: Pose, w: number, h: number): Vec2 {
    const scale = (Math.min(w, h) * FOV) / pose.z;
    return { x: w / 2 + pose.x * scale, y: h / 2 - pose.y * scale };
}

/** Apparent half-width of a cube on screen, in CSS pixels. */
export function screenRadius(pose: Pose, w: number, h: number): number {
    return (pose.size * (Math.min(w, h) * FOV)) / pose.z;
}

/** Screen bounds of the whole word. */
export function wordBounds(
    poses: readonly Pose[],
    w: number,
    h: number,
): { x: number; y: number; w: number; h: number } {
    let lo = Infinity;
    let top = Infinity;
    let hi = -Infinity;
    let bot = -Infinity;
    for (const p of poses) {
        const s = screenOf(p, w, h);
        const r = screenRadius(p, w, h);
        if (s.x - r < lo) lo = s.x - r;
        if (s.x + r > hi) hi = s.x + r;
        if (s.y - r < top) top = s.y - r;
        if (s.y + r > bot) bot = s.y + r;
    }
    if (!Number.isFinite(lo)) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: lo, y: top, w: hi - lo, h: bot - top };
}
