/* ══════════════════════════════════════════════════════
   The cube field

   Translucent blocks tumbling through the alert screen, after
   the PlayStation 2's red screen of death. That reference is
   a good one precisely because nobody has ever mistaken it
   for a browser error: it is unmistakably a designed screen,
   which is the whole problem this entrance has been solving.

   ── Canvas 2D and a hand-rolled projection ──
   Not a 3D library. Every other moving thing in this repo is
   drawn the same way — the atlas, the orbit field, and this
   gate's own carrier and ECG — and a WebGL dependency on the
   first screen anyone loads is not worth one backdrop.

   ── Pure, so a frame is reproducible ──
   Nothing accumulates. A cube's pose is a function of its
   seed and the clock, so the same `t` always gives the same
   frame and the shape of the field is provable in node like
   ecg.ts, wave.ts, blend.ts, layout.ts and flight.ts. That
   matters more than usual here: this paints BEHIND text that
   has to stay readable, and "a cube went somewhere it should
   not have" is otherwise only findable by sitting and
   watching.
   ══════════════════════════════════════════════════════ */

export interface Vec3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface Cube {
    /** Home position. X and Y sway around this; Z drifts away from it. */
    readonly ox: number;
    readonly oy: number;
    readonly oz: number;
    /** Half-extent, in world units. */
    readonly size: number;
    /** Rotation at t = 0, so the field does not start axis-aligned. */
    readonly rox: number;
    readonly roy: number;
    /** Rotation rates, radians per second. */
    readonly rrx: number;
    readonly rry: number;
    /** Depth drift, world units per second. Signed. */
    readonly dz: number;
    /** Sway phases. Four of them, so no two cubes share a path. */
    readonly ax1: number;
    readonly ax2: number;
    readonly ay1: number;
    readonly ay2: number;
}

export interface Pose {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly rx: number;
    readonly ry: number;
    readonly size: number;
}

export interface Pt2 {
    readonly x: number;
    readonly y: number;
    /** Depth carried through, so the caller can shade without re-projecting. */
    readonly z: number;
}

export interface Face {
    readonly pts: readonly Pt2[];
    readonly depth: number;
}

export interface Rendered {
    readonly faces: readonly Face[];
    /** 0…1. Alpha multiplier. Zero at both depth planes — see `depthFade`. */
    readonly fade: number;
    /** 0…1, far → near. Drives how lit a block reads. */
    readonly near: number;
}

/* ── The world ─────────────────────────────────────────
   X and Y are world units either side of the centre line; how much of the
   screen that covers depends on depth, which is the point — a block sweeps
   out of frame as it comes toward the camera and drifts back into it as it
   recedes.

   Z is distance from the camera and is the only axis that travels. NEAR is
   deliberately well clear of 0: a face crossing the camera plane projects to
   infinity, and clamping after the fact leaves a visible smear as it goes. */
export const NEAR = 1.8;
export const FAR = 7;
export const FOV = 1.15;

/** Half-extents of the spawn box. */
export const SPREAD_X = 1.8;
export const SPREAD_Y = 1.3;

/**
 * Size range. Independent of depth — perspective does the sorting for us.
 *
 * The ceiling is not a taste call. A block that fills the frame stops being a
 * backdrop and becomes a wall behind the headline, and the two numbers that
 * decide it are this and `NEAR`; there is a test that measures the largest
 * span any *legible* block ever reaches and holds it under 62% of the short
 * edge. Raise either and that is what fails.
 */
export const SIZE_MIN = 0.12;
export const SIZE_MAX = 0.28;

/* Sway amplitudes, per axis, for the two components. Two incommensurate
   frequencies rather than one: a single sine is a pendulum, and a pendulum is
   the one motion the eye reads as a screensaver. */
const SWAY_A = 0.16;
const SWAY_B = 0.09;
/** The most a cube can ever be displaced from its home X or Y. */
export const SWAY_MAX = SWAY_A + SWAY_B;

/**
 * Width of the fade band at each depth plane.
 *
 * THIS IS WHAT MAKES THE WRAP INVISIBLE. Depth wraps so the field never
 * empties and never respawns, but a wrap is a teleport, and a block winking
 * out at one plane and in at the other is exactly the sort of thing the eye
 * catches on a screen the reader is supposed to be reading past. Alpha
 * therefore reaches zero at BOTH planes, so the jump happens while there is
 * nothing on screen to jump.
 *
 * At the fastest drift (0.06/s) crossing this band takes ~23 seconds.
 */
export const FADE_BAND = 1.4;

/** Depth drift, world units per second. */
const DZ_MIN = 0.02;
const DZ_MAX = 0.06;

const TAU = Math.PI * 2;

/** Unit cube, centred on the origin. */
export const CUBE_VERTS: readonly Vec3[] = [
    { x: -1, y: -1, z: -1 },
    { x: 1, y: -1, z: -1 },
    { x: 1, y: 1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: 1, z: 1 },
    { x: -1, y: 1, z: 1 },
];

/**
 * Six faces as vertex indices, each wound consistently.
 *
 * Quads, not triangles. They are drawn with `fill()`, which does not care,
 * and four points per face keeps the painter's-algorithm sort honest —
 * splitting a face in two lets the halves sort apart and crack it open along
 * the diagonal.
 */
export const CUBE_FACES: readonly (readonly number[])[] = [
    [0, 1, 2, 3], // back
    [4, 5, 6, 7], // front
    [0, 1, 5, 4], // bottom
    [3, 2, 6, 7], // top
    [0, 3, 7, 4], // left
    [1, 2, 6, 5], // right
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Smoothstep. Used for the depth fades, so neither end has a corner in it. */
const smooth = (v: number) => {
    const t = clamp01(v);
    return t * t * (3 - 2 * t);
};

const wrapDepth = (z: number): number => {
    const span = FAR - NEAR;
    return NEAR + ((((z - NEAR) % span) + span) % span);
};

/**
 * Lay out a field.
 *
 * `rand` is injected rather than read off `Math.random`, so a test can seed it
 * and assert against an exact field — the same reason `randomTtl` takes one in
 * gate.ts.
 */
export function spawnField(n: number, rand: () => number): Cube[] {
    const out: Cube[] = [];

    for (let i = 0; i < n; i++) {
        /* Spread through the middle of the depth range rather than uniformly.
           Spawning onto a fade plane means opening the screen on a block that
           is already invisible. */
        const oz = NEAR + FADE_BAND + rand() * (FAR - NEAR - FADE_BAND * 2);

        out.push({
            ox: (rand() * 2 - 1) * SPREAD_X,
            oy: (rand() * 2 - 1) * SPREAD_Y,
            oz,
            size: SIZE_MIN + rand() * (SIZE_MAX - SIZE_MIN),
            rox: rand() * TAU,
            roy: rand() * TAU,
            // Slow. This is a room, not a screensaver.
            rrx: (rand() * 2 - 1) * 0.14,
            rry: (rand() * 2 - 1) * 0.14,
            dz: (rand() < 0.5 ? -1 : 1) * (DZ_MIN + rand() * (DZ_MAX - DZ_MIN)),
            ax1: rand() * TAU,
            ax2: rand() * TAU,
            ay1: rand() * TAU,
            ay2: rand() * TAU,
        });
    }

    return out;
}

/**
 * Where a cube is, and how it is turned, at time `t` seconds.
 *
 * X AND Y SWAY; ONLY Z TRAVELS. An earlier version drifted linearly on all
 * three axes and wrapped each one, which cannot work: how far off-screen a
 * given X sits depends entirely on depth, so a wrap bound that hides the jump
 * for a near block puts it in plain view in the middle of the frame for a far
 * one. Bounded sway needs no wrap at all, and depth — the one axis whose wrap
 * *can* be hidden, because alpha goes to zero at both planes — carries the
 * travel.
 */
export function poseAt(cube: Cube, t: number): Pose {
    const sway =
        Math.sin(t * 0.19 + cube.ax1) * SWAY_A +
        Math.sin(t * 0.31 + cube.ax2) * SWAY_B;
    const bob =
        Math.sin(t * 0.23 + cube.ay1) * SWAY_A +
        Math.sin(t * 0.13 + cube.ay2) * SWAY_B;

    return {
        x: cube.ox + sway,
        y: cube.oy + bob,
        z: wrapDepth(cube.oz + cube.dz * t),
        rx: cube.rox + cube.rrx * t,
        ry: cube.roy + cube.rry * t,
        size: cube.size,
    };
}

/**
 * 0 at the far plane, 1 at the near one.
 *
 * Drives how lit a block reads — the only reason the field has any depth to
 * it beyond raw scale.
 */
export function nearness(z: number): number {
    return clamp01((FAR - z) / (FAR - NEAR));
}

/**
 * Alpha envelope: 0 at BOTH planes, 1 through the middle.
 *
 * See `FADE_BAND`. This is the wrap concealer, and the test that matters here
 * asserts it — whenever depth jumps, this is already at zero.
 */
export function depthFade(z: number): number {
    return smooth((z - NEAR) / FADE_BAND) * smooth((FAR - z) / FADE_BAND);
}

/**
 * Project a cube-local vertex to canvas pixels.
 *
 * Y is up in world space and down on the canvas, hence the negation. On a
 * field this symmetric getting that backwards looks identical, which is
 * exactly why it is worth writing down.
 */
export function project(v: Vec3, pose: Pose, w: number, h: number): Pt2 {
    const { rx, ry, size } = pose;

    // Rotate about Y, then X. The order is fixed and the two are not
    // interchangeable.
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const x1 = v.x * cy + v.z * sy;
    const z1 = -v.x * sy + v.z * cy;

    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const y2 = v.y * cx - z1 * sx;
    const z2 = v.y * sx + z1 * cx;

    const wx = pose.x + x1 * size;
    const wy = pose.y + y2 * size;
    /* Floored. The CENTRE can never reach the camera, but a corner of the
       largest cube at the near plane comes 0.49 closer than the centre does,
       and a small divisor throws the vertex thousands of pixels out. Belt and
       braces: the geometry already keeps this positive, and a test says so. */
    const wz = Math.max(NEAR * 0.5, pose.z + z2 * size);

    const scale = (Math.min(w, h) * FOV) / wz;

    return { x: w / 2 + wx * scale, y: h / 2 - wy * scale, z: wz };
}

/**
 * Mean depth of a face, for painter's-algorithm sorting.
 *
 * Mean rather than nearest vertex: sorting on the nearest corner makes two
 * faces that share an edge swap order as a cube turns, which shows up as the
 * silhouette flickering inside out.
 */
export function faceDepth(pts: readonly Pt2[]): number {
    if (pts.length === 0) return 0;
    let sum = 0;
    for (const p of pts) sum += p.z;
    return sum / pts.length;
}

/**
 * Everything the canvas needs for one cube in one frame: its six faces sorted
 * back to front, plus the two shading scalars.
 *
 * Assembled here rather than in the component so the draw loop is a `fill()`
 * and a `stroke()` per face and nothing else — and so the sort order, which
 * is the part that goes wrong, is testable.
 */
export function renderCube(cube: Cube, t: number, w: number, h: number): Rendered {
    const pose = poseAt(cube, t);
    const pts = CUBE_VERTS.map((v) => project(v, pose, w, h));

    const faces = CUBE_FACES
        .map((idx) => {
            const quad = idx.map((i) => pts[i]);
            return { pts: quad, depth: faceDepth(quad) };
        })
        // Back to front: the deepest face is painted first and the nearest
        // last, so translucency stacks in the order the eye expects.
        .sort((a, b) => b.depth - a.depth);

    return { faces, fade: depthFade(pose.z), near: nearness(pose.z) };
}
