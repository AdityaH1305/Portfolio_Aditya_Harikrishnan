/* ══════════════════════════════════════════════════════
   The finale

   What the press actually does: the six blocks gather into
   one giant cube, and that cube shatters into the hero.

   ── Why this is its own module ──
   Same reasoning as `forces.ts` beside it, and as
   `flight.ts` beside SkillOrbit's engine: the choreography
   is arithmetic, so node can check it frame by frame, and
   the component is left with a draw call.

   It matters more here than usual because this sequence
   plays ONCE, lasts two seconds, and is the last thing
   between a stranger and the site. Nobody is going to notice
   a fragment that fails to fade or a convergence that lands
   a few pixels short by watching it go past — but both are
   trivially assertable.

   ── It adds no geometry ──
   The merged cube is not a new object. Six blocks eased to
   the same position, the same size and the same angle ARE a
   single cube, and their translucent faces stacking as they
   arrive is what makes it read as solid and lit from inside.
   The fragments are cubes too. Everything here is drawn by
   `cubes.ts`'s existing `project` / `renderCube`, so the
   debris is made of the same material as the blocks that
   formed it.
   ══════════════════════════════════════════════════════ */

/* `./cubes.ts`, with the extension: this module is in a test's own graph and
   Node's ESM resolver has no extension guessing. `cubes.ts` gets away with a
   bare `./forces` only because that import is type-only and erased. */
import { FOV, NEAR, type Cube, type Pose } from "./cubes.ts";

/* ── The merged cube ───────────────────────────────────
   Where the six blocks are going, and how big they get. Depth is a fixed
   plane rather than each block's own oscillation, or they would arrive at
   subtly different sizes and the "single cube" would have a soft edge. */

/** Depth the merged cube sits at. Mid-field: close enough to dominate. */
export const MERGE_Z = 3.4;

/** Half-extent of the merged cube, world units. Roughly three times a block. */
export const MERGE_SIZE = 0.62;

/** The angle every block turns to. Slightly off-axis, so it reads as a solid
    in three dimensions rather than as a flat square. */
export const MERGE_RX = 0.42;
export const MERGE_RY = 0.62;

/* ── The shatter ───────────────────────────────────────
   3 × 3 × 3. Odd on purpose: an even split has no centre cell, and the
   fragment that stays roughly in the middle for a moment is what sells the
   burst as a solid coming apart rather than a ring expanding. */
export const AXIS_CELLS = 3;
export const FRAGMENT_COUNT = AXIS_CELLS ** 3;

/** How far a fragment travels, in units of the merged cube's half-extent. */
const SPREAD_MIN = 2.6;
const SPREAD_MAX = 5.4;

/** Fragments turn as they go. Radians across the whole burst. */
const SPIN_MAX = 4.2;

/** Fraction of the burst spent at full opacity before the fade begins. */
const HOLD = 0.18;

/**
 * How much a fragment shrinks across the burst.
 *
 * WITHOUT THIS THE BURST READS AS A FIELD OF CUBES, NOT AS DEBRIS. Each
 * fragment is a third of the merged cube, which is about the size of one of
 * the six blocks that formed it — so at rest they are correct, and in flight
 * they simply look like more of the same object arranged differently. Real
 * debris recedes; shrinking them as they go is what turns a scatter into an
 * explosion.
 */
const SHRINK = 0.55;

/**
 * How much of a fragment's travel is toward or away from the camera.
 *
 * Damped, not removed. At full strength the pieces aimed at the viewer grow
 * enormous and cross most of the frame, which reads as aggressive rather than
 * as an explosion seen from a distance — and the centre cell, which has no
 * direction of its own, was the worst of them. Depth variation stays; the
 * rush at the camera goes.
 */
const DEPTH_TRAVEL = 0.5;

export interface Fragment {
    /** Lattice cell centre, in units of the merged cube's half-extent. */
    readonly ox: number;
    readonly oy: number;
    readonly oz: number;
    /** Unit direction of travel, away from the centre. */
    readonly dx: number;
    readonly dy: number;
    readonly dz: number;
    /** How far it goes, in the same units as the lattice. */
    readonly reach: number;
    /** Spin, radians across the burst. */
    readonly srx: number;
    readonly sry: number;
    /** Rotation at the moment of the burst. */
    readonly rx0: number;
    readonly ry0: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Decelerating. The burst is fastest at the instant it happens. */
export function easeOut(t: number): number {
    const c = clamp01(t);
    return 1 - Math.pow(1 - c, 3);
}

/** Accelerating in, decelerating out. Used by the convergence. */
export function easeInOut(t: number): number {
    const c = clamp01(t);
    return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Cut the merged cube into a lattice of fragments.
 *
 * THE CELLS TILE THE CUBE EXACTLY at rest — 27 of them, each a third of the
 * whole, centres on a regular grid, no gaps and no overlap. That is the whole
 * effect: a burst that begins as a cloud of pieces near the middle rather than
 * as a solid coming apart is a particle effect, not a shatter. There is a test.
 *
 * `rand` is injected rather than read off `Math.random`, so a test can seed it
 * and assert against an exact burst — the same reason `spawnField` takes one.
 */
export function shatter(rand: () => number): Fragment[] {
    const out: Fragment[] = [];
    const step = 2 / AXIS_CELLS; // cell size in half-extent units
    const first = -1 + step / 2; // centre of the first cell

    for (let i = 0; i < AXIS_CELLS; i++) {
        for (let j = 0; j < AXIS_CELLS; j++) {
            for (let k = 0; k < AXIS_CELLS; k++) {
                const ox = first + i * step;
                const oy = first + j * step;
                const oz = first + k * step;

                /* Travel is radial from the centre of the cube, so the solid
                   comes apart the way a solid does. The centre cell has no
                   direction of its own — it is the one at (0,0,0) — so it gets
                   a fixed one rather than a NaN.

                   LATERAL, not toward the camera. `[0, 0, 1]` was the obvious
                   fallback and it put the one fragment with nowhere to go
                   straight at the viewer, where it grew to fill a third of the
                   frame while everything else was leaving. */
                const len = Math.hypot(ox, oy, oz);
                const [dx, dy, dz] =
                    len < 1e-6
                        ? [0.82, 0.57, 0]
                        : [ox / len, oy / len, (oz / len) * DEPTH_TRAVEL];

                out.push({
                    ox,
                    oy,
                    oz,
                    dx,
                    dy,
                    dz,
                    reach: SPREAD_MIN + rand() * (SPREAD_MAX - SPREAD_MIN),
                    srx: (rand() * 2 - 1) * SPIN_MAX,
                    sry: (rand() * 2 - 1) * SPIN_MAX,
                    rx0: MERGE_RX,
                    ry0: MERGE_RY,
                });
            }
        }
    }

    return out;
}

/** A fragment's pose and opacity at burst progress `u` (0…1). */
export interface Debris {
    readonly pose: Pose;
    /** 0…1. Zero by the end of the burst — see `HOLD`. */
    readonly alpha: number;
}

/**
 * Where a fragment is, part way through the burst.
 *
 * Travel eases OUT: the pieces leave fast and coast, which is what an
 * explosion looks like. A linear burst reads as a diagram of one.
 *
 * Depth is clamped short of the camera plane. A fragment thrown toward the
 * viewer would otherwise cross it and project to a wild coordinate — a full
 * screen of streaked polygon in the middle of the one gesture that has to be
 * clean.
 */
export function debrisAt(f: Fragment, u: number): Debris {
    const p = clamp01(u);
    const travel = easeOut(p) * f.reach;
    const cell = MERGE_SIZE / AXIS_CELLS;

    const x = (f.ox + f.dx * travel) * MERGE_SIZE;
    const y = (f.oy + f.dy * travel) * MERGE_SIZE;
    const z = Math.max(NEAR * 0.9, MERGE_Z + (f.oz + f.dz * travel) * MERGE_SIZE);

    /* Full opacity for the first slice, then out. Fading from the very first
       frame would make the burst look like it was already over when it began. */
    const fade = p <= HOLD ? 1 : 1 - (p - HOLD) / (1 - HOLD);

    return {
        pose: {
            x,
            y,
            z,
            rx: f.rx0 + f.srx * p,
            ry: f.ry0 + f.sry * p,
            // Shrinking as they go — see `SHRINK`. Eased on the same curve as
            // the travel, so a piece's size and its distance stay in step.
            size: cell * (1 - SHRINK * easeOut(p)),
        },
        alpha: clamp01(fade),
    };
}

/**
 * A block part way through the convergence.
 *
 * `u` runs 0…1 across the converge window. At 1 every block returns exactly
 * the same pose, which is what makes six of them a single cube — there is a
 * test asserting that, because "nearly the same" would show as a soft,
 * multiplied edge rather than one solid.
 *
 * `from` is the block's live pose the instant the button was pressed. It is
 * captured once and then frozen: reading it live would mean the physics were
 * still pushing blocks around while they were supposed to be gathering, and
 * the convergence would fight the field.
 */
export function convergeAt(from: Pose, u: number): Pose {
    const e = easeInOut(u);
    const mix = (a: number, b: number) => a + (b - a) * e;

    return {
        x: mix(from.x, 0),
        y: mix(from.y, 0),
        z: mix(from.z, MERGE_Z),
        rx: mix(from.rx, MERGE_RX),
        ry: mix(from.ry, MERGE_RY),
        size: mix(from.size, MERGE_SIZE),
    };
}

/**
 * World-space pose for a block at rest, as the physics leaves it.
 *
 * The field stores screen-anchored positions and multiplies depth back in at
 * draw time (see `poseAt` in cubes.ts). The convergence needs the same
 * conversion to start from where a block actually IS, or every block would
 * jump at the instant the button was pressed.
 */
export function poseOf(cube: Cube, z: number, t: number): Pose {
    const k = z / FOV;
    return {
        x: cube.x * k,
        y: -cube.y * k,
        z,
        rx: cube.rox + cube.rrx * t,
        ry: cube.roy + cube.rry * t,
        size: cube.size,
    };
}
