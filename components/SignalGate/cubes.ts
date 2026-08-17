/* ══════════════════════════════════════════════════════
   The cube field

   A handful of translucent blocks drifting around the alert
   screen, after the PlayStation 2's red screen of death.
   That reference is a good one precisely because nobody has
   ever mistaken it for a browser error: it is unmistakably a
   designed screen, which is the whole problem this entrance
   has been solving.

   ── SIX BLOCKS, AND THEY ORBIT THE COPY ──
   The first version spawned thirty at uniformly random world
   positions, which put most of them in the middle of the
   screen: the headline, the trace and the button all had a
   block behind them and the whole thing read as noise. The
   count came down to six and the placement stopped being
   random.

   Each cube holds a BEARING and a RADIUS on a ring drawn
   around the content column, and it drifts slowly around
   that ring. The ring is expressed in fractions of the
   viewport, so `anchorAt` is pure and viewport-free and the
   keep-out is provable at every screen size at once — see
   `KEEP_X` / `KEEP_Y`.

   ── Screen-anchored, not world-anchored ──
   The consequence of the above, and it is the part that is
   easy to get wrong. Depth is divided out when the anchor is
   converted to world space, so a cube keeps its place on
   screen as it moves toward and away from the camera. Anchor
   it in world space instead and the projection pulls it
   toward the centre of the frame as it recedes — every cube
   ends up crossing the copy eventually, which is exactly the
   problem the ring was introduced to fix.

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
    /** Bearing around the content column at t = 0, radians. */
    readonly theta: number;
    /** Angular drift, radians per second. Signed, and very small. */
    readonly omega: number;
    /** Mean distance from centre, in units of the keep-out ellipse. */
    readonly radius: number;
    /** Radial breathing, so the ring is not a rigid circle. */
    readonly swing: number;
    readonly swingRate: number;
    readonly swingPhase: number;
    /** Depth OSCILLATES between two bounds rather than drifting and wrapping. */
    readonly zMid: number;
    readonly zAmp: number;
    readonly zRate: number;
    readonly zPhase: number;
    /** Half-extent, in world units. */
    readonly size: number;
    /** Rotation at t = 0, so the field does not start axis-aligned. */
    readonly rox: number;
    readonly roy: number;
    /** Rotation rates, radians per second. */
    readonly rrx: number;
    readonly rry: number;
}

/** Where a cube sits on screen, as a signed fraction of the viewport. */
export interface Anchor {
    /** −0.5 is the left edge, +0.5 the right. */
    readonly fx: number;
    /** −0.5 is the top edge, +0.5 the bottom. Down-positive, like the canvas. */
    readonly fy: number;
    /** Distance in keep-out-ellipse units. Always ≥ 1. */
    readonly r: number;
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
    /** 0…1, far → near. Drives how lit a block reads. */
    readonly near: number;
}

/* ── The camera ──────────────────────────────────────── */
export const NEAR = 2.2;
export const FAR = 7;
export const FOV = 1.15;

/**
 * The keep-out ellipse: semi-axes as fractions of the viewport, measured from
 * its centre. NOTHING IS EVER DRAWN INSIDE THIS.
 *
 * Sized to the content column — 34rem wide and about 490px tall on a desktop,
 * which is 0.19 × 0.27 of a 1440 × 900 viewport — with margin on both axes.
 * Fractions rather than pixels, so one assertion covers every screen size.
 *
 * On a phone the column fills the width and no ring can clear it sideways.
 * That is what the scrim is for, and the composited contrast is measured with
 * a block sitting directly behind the type.
 */
export const KEEP_X = 0.32;
export const KEEP_Y = 0.33;

/** Ring radii, in units of the keep-out ellipse. 1 IS the ellipse. */
export const RING_MIN = 1.0;
export const RING_MAX = 1.4;

/**
 * Size range. See the "wall" test — this and `NEAR` are what it measures.
 *
 * The keep-out constrains a cube's CENTRE, not its extent, so a block sitting
 * on the ellipse still reaches inward by its own half-span. Shrinking this is
 * the lever that buys the copy air; pushing the ring further out is not,
 * because past `RING_MAX` the blocks leave the frame.
 */
export const SIZE_MIN = 0.14;
export const SIZE_MAX = 0.26;

/** Clearance kept between the depth planes and the field. */
const Z_MARGIN = 0.4;

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

/**
 * Lay out a field.
 *
 * BEARINGS ARE DEALT, NOT ROLLED. Each cube gets its own slice of the circle
 * and may wander a little inside it, so six blocks are always spread around
 * the frame. Six independent random bearings clump — that is what random
 * does, and with a field this small one clump is the whole composition.
 *
 * The half-slice offset matters too: at `i / n` a six-cube field puts blocks
 * at 0 and π, dead level with the middle of the copy on both sides. At
 * `(i + 0.5) / n` the nearest bearings are 30° off that line.
 *
 * THAT ONLY WORKS FOR AN EVEN `n`, and the callers are 6 and 4 for exactly
 * that reason. Five slices offset by a half still lands one bearing on 180°,
 * which is the worst place on the ring — level with the headline. There is a
 * test for it, and it caught a five-cube phone field doing precisely this.
 *
 * `rand` is injected rather than read off `Math.random`, so a test can seed it
 * and assert against an exact field — the same reason `randomTtl` takes one in
 * gate.ts.
 */
export function spawnField(n: number, rand: () => number): Cube[] {
    const out: Cube[] = [];
    const slice = TAU / Math.max(n, 1);

    for (let i = 0; i < n; i++) {
        const swing = 0.04 + rand() * 0.06;
        const zAmp = 0.3 + rand() * 0.6;
        const lo = NEAR + Z_MARGIN + zAmp;
        const hi = FAR - Z_MARGIN - zAmp;

        out.push({
            // Own slice, with up to a quarter-slice of wander either way.
            theta: (i + 0.5) * slice + (rand() - 0.5) * slice * 0.5,
            // A lap takes between three and ten minutes. This is a room, not
            // a screensaver.
            omega: (rand() < 0.5 ? -1 : 1) * (0.01 + rand() * 0.02),
            radius: RING_MIN + swing + rand() * (RING_MAX - RING_MIN - swing * 2),
            swing,
            swingRate: 0.09 + rand() * 0.1,
            swingPhase: rand() * TAU,
            zAmp,
            zMid: lo + rand() * (hi - lo),
            zRate: (rand() < 0.5 ? -1 : 1) * (0.03 + rand() * 0.05),
            zPhase: rand() * TAU,
            size: SIZE_MIN + rand() * (SIZE_MAX - SIZE_MIN),
            rox: rand() * TAU,
            roy: rand() * TAU,
            rrx: (rand() * 2 - 1) * 0.11,
            rry: (rand() * 2 - 1) * 0.11,
        });
    }

    return out;
}

/**
 * Where a cube sits on screen at time `t`, in viewport fractions.
 *
 * Viewport-free on purpose: the keep-out is an assertion about fractions, so
 * one test covers 375px and 1440px and everything between at once.
 */
export function anchorAt(cube: Cube, t: number): Anchor {
    const th = cube.theta + cube.omega * t;
    const r =
        cube.radius + Math.sin(t * cube.swingRate + cube.swingPhase) * cube.swing;

    return { fx: r * KEEP_X * Math.cos(th), fy: r * KEEP_Y * Math.sin(th), r };
}

/** Depth at time `t`. Bounded oscillation — see `poseAt`. */
export function depthAt(cube: Cube, t: number): number {
    return cube.zMid + cube.zAmp * Math.sin(t * cube.zRate + cube.zPhase);
}

/**
 * Where a cube is in world space, and how it is turned, at time `t` seconds.
 *
 * DEPTH OSCILLATES; IT DOES NOT WRAP. An earlier version drifted linearly in
 * depth and wrapped at the planes, which needed an alpha envelope closing to
 * zero at both ends to hide the teleport — and with only six blocks on screen
 * that envelope was taking one or two of them out of the picture at a time.
 * Bounded oscillation has no seam to hide, so every cube is visible for as
 * long as the screen is up.
 *
 * The anchor is divided by the projection's own depth scale, which is what
 * pins the cube to its place on screen as it moves in and out.
 */
export function poseAt(cube: Cube, t: number, w: number, h: number): Pose {
    const { fx, fy } = anchorAt(cube, t);
    const z = depthAt(cube, t);
    const k = z / (Math.min(w, h) * FOV);

    return {
        x: fx * w * k,
        // Negated: world Y is up, the anchor's is down.
        y: -fy * h * k,
        z,
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
       largest cube reaches 0.52 closer than the centre does, and a small
       divisor throws the vertex thousands of pixels out. Belt and braces: the
       geometry already keeps this well clear, and a test says so. */
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
 * back to front, plus the shading scalar.
 *
 * Assembled here rather than in the component so the draw loop is a `fill()`
 * and a `stroke()` per face and nothing else — and so the sort order, which
 * is the part that goes wrong, is testable.
 */
export function renderCube(cube: Cube, t: number, w: number, h: number): Rendered {
    const pose = poseAt(cube, t, w, h);
    const pts = CUBE_VERTS.map((v) => project(v, pose, w, h));

    const faces = CUBE_FACES
        .map((idx) => {
            const quad = idx.map((i) => pts[i]);
            return { pts: quad, depth: faceDepth(quad) };
        })
        // Back to front: the deepest face is painted first and the nearest
        // last, so translucency stacks in the order the eye expects.
        .sort((a, b) => b.depth - a.depth);

    return { faces, near: nearness(pose.z) };
}
