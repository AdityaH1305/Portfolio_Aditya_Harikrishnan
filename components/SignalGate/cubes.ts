/* ══════════════════════════════════════════════════════
   The cube field — geometry

   Translucent blocks drifting through the entrance, lit in
   the site's own ice and accent.

   ── What this module is, and is not ──
   THE GEOMETRY ONLY: a unit cube, a projection, and the
   shading scalars. Where the blocks actually go is
   `forces.ts`, which integrates them under repulsion, the
   pointer and the copy's keep-out.

   That split is the one SkillOrbit already uses — a pure
   solver beside a pure rules module beside a stateful engine
   — and it exists because the two halves fail differently.
   Geometry fails visibly and instantly; physics fails
   subtly, over minutes, in ways only a simulation catches.

   ── It used to be an orbit ──
   Positions were analytic: a bearing and a radius on a fixed
   ring, so `poseAt(cube, t)` was a pure function of the clock
   and "nothing is ever drawn on the copy" was true by
   construction. Blocks that push each other cannot work that
   way. The ring is gone; the guarantee moved into
   `projectOut` and is asserted frame by frame instead.

   ── Canvas 2D and a hand-rolled projection ──
   Not a 3D library. Every other moving thing in this repo is
   drawn the same way, and a WebGL dependency on the first
   screen anyone loads is not worth one backdrop.
   ══════════════════════════════════════════════════════ */

import type { Body } from "./forces";

export interface Vec3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/**
 * A block: its physics state, plus everything needed to draw it.
 *
 * One object rather than two parallel arrays, so a body and its geometry can
 * never fall out of step — which is exactly the bug a field of six would take
 * a long time to reveal.
 */
export interface Cube extends Body {
    /**
     * Where the physics wants this block to be at rest — the position
     * `spawnField` chose for it.
     *
     * ON THE CUBE RATHER THAN IN A PARALLEL ARRAY, for the reason stated above
     * this interface. `arrival.ts` overwrites `x`/`y` every frame while the
     * block is flying in, so that everything downstream — the pointer scatter,
     * the pose freeze at `CONVERGE_AT`, the merge — reads a live position with
     * no special case for "is it still arriving". That is what makes a press
     * during the arrival safe: the block always holds where it is drawn.
     *
     * But the arrival still needs to know where it is going, and an array
     * indexed alongside `fieldRef` is exactly the kind of thing that survives
     * one refactor and not two.
     */
    readonly restX: number;
    readonly restY: number;
    /** Half-extent, in world units. */
    readonly size: number;
    /** Depth OSCILLATES between two bounds. It is not part of the physics. */
    readonly zMid: number;
    readonly zAmp: number;
    readonly zRate: number;
    readonly zPhase: number;
    /** Rotation at t = 0, so the field does not start axis-aligned. */
    readonly rox: number;
    readonly roy: number;
    /** Rotation rates, radians per second. */
    readonly rrx: number;
    readonly rry: number;
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
 * `forces.ts` enforces it; this is where the number lives because it is a
 * statement about the layout, not about the physics. Sized to the copy column
 * with margin, in FRACTIONS so one value covers every screen size.
 *
 * On a phone the column fills the width and no exclusion zone can clear it
 * sideways. That is what the scrim is for, and the composited contrast is
 * measured with a block sitting directly behind the type.
 */
export const KEEP_X = 0.28;
export const KEEP_Y = 0.3;

/** Size range, in world units. See the "wall" test — this and `NEAR` set it. */
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
 * The physics half of a viewport, in `min(w, h)` units.
 *
 * Everything `forces.ts` needs about the screen, derived in one place so the
 * component never converts by hand. Note that `keepY` uses the viewport HEIGHT
 * against the short edge, which on a phone makes the exclusion zone taller
 * than it is wide — as the copy column is.
 */
export function envFor(w: number, h: number) {
    const m = Math.min(w, h);
    return {
        halfX: w / 2 / m,
        halfY: h / 2 / m,
        keepX: (KEEP_X * w) / m,
        keepY: (KEEP_Y * h) / m,
    };
}

/**
 * Lay out a field.
 *
 * Blocks start spread evenly around the copy — one slice of the circle each,
 * with a little wander inside it — because six independent random positions
 * clump, and with a field this small one clump is the whole composition. The
 * physics takes over from there; this only decides where the first frame is.
 *
 * `rand` is injected rather than read off `Math.random`, so a test can seed it
 * and simulate an exact field — the same reason `randomTtl` used to take one.
 */
export function spawnField(
    n: number,
    rand: () => number,
    w: number,
    h: number,
): Cube[] {
    const { keepX, keepY } = envFor(w, h);
    const out: Cube[] = [];
    const slice = TAU / Math.max(n, 1);

    for (let i = 0; i < n; i++) {
        const th = (i + 0.5) * slice + (rand() - 0.5) * slice * 0.5;
        const spread = 1.2 + rand() * 0.35;
        const zAmp = 0.3 + rand() * 0.6;
        const lo = NEAR + Z_MARGIN + zAmp;
        const hi = FAR - Z_MARGIN - zAmp;

        const x = Math.cos(th) * keepX * spread;
        const y = Math.sin(th) * keepY * spread;

        out.push({
            x,
            y,
            // Where `arrival.ts` flies it back to. Identical at spawn, and
            // never written again.
            restX: x,
            restY: y,
            vx: 0,
            vy: 0,
            // Replaced every frame by `collisionRadius`; a sane first value so
            // the very first step is not a special case.
            r: 0.08,
            wx: rand() * TAU,
            wy: rand() * TAU,
            size: SIZE_MIN + rand() * (SIZE_MAX - SIZE_MIN),
            zAmp,
            zMid: lo + rand() * (hi - lo),
            zRate: (rand() < 0.5 ? -1 : 1) * (0.03 + rand() * 0.05),
            zPhase: rand() * TAU,
            rox: rand() * TAU,
            roy: rand() * TAU,
            rrx: (rand() * 2 - 1) * 0.11,
            rry: (rand() * 2 - 1) * 0.11,
        });
    }

    return out;
}

/**
 * Depth at time `t`. Bounded oscillation — it never wraps.
 *
 * DEPTH IS NOT PART OF THE PHYSICS. Two blocks "touching" is something that
 * happens on the screen, not in the world, so the repulsion is 2D and this
 * axis is left analytic. It also means depth cannot be perturbed into the
 * camera by a hard shove, which would be a very loud way to fail.
 */
export function depthAt(cube: Cube, t: number): number {
    return cube.zMid + cube.zAmp * Math.sin(t * cube.zRate + cube.zPhase);
}

/**
 * How much of a cube's own size its silhouette actually spans.
 *
 * A turning cube is between 1.0 half-extents wide face-on, √2 edge-on and √3
 * corner-on, so a single number has to sit somewhere in that range. 1.35 is
 * about the mean over all orientations: face-on it errs slightly generous,
 * corner-on slightly tight, and neither is visible on a translucent block.
 *
 * The first version used 1.0 — the FACE half-extent — and a test caught it
 * immediately: the drawn silhouette reached 2.2× the radius the physics was
 * using, so blocks would have visibly overlapped before anything pushed.
 */
const SOLID_SPAN = 1.35;

/**
 * A block's radius on screen, in the physics' own units.
 *
 * Derived rather than stored, because it depends on depth: a near block is
 * drawn larger and so has to start pushing from further away. Feeding a fixed
 * radius in would make far blocks barge and near ones interpenetrate.
 */
export function collisionRadius(cube: Cube, z: number): number {
    return (cube.size * SOLID_SPAN * FOV) / z;
}

/** 0 at the far plane, 1 at the near one. Drives how lit a block reads. */
export function nearness(z: number): number {
    return clamp01((FAR - z) / (FAR - NEAR));
}

/**
 * Where a block is in world space, and how it is turned, at time `t`.
 *
 * Its screen position comes straight from the physics; the conversion here
 * multiplies depth back in, so a block holds its place on screen as it moves
 * toward and away from the camera. Without that division perspective drags
 * every block toward the middle of the frame as it recedes — and the middle of
 * the frame is the copy.
 */
export function poseAt(cube: Cube, t: number, w: number, h: number): Pose {
    const z = depthAt(cube, t);
    const k = z / FOV;

    return {
        x: cube.x * k,
        // Negated: world Y is up, the physics' Y is down like the canvas.
        y: -cube.y * k,
        z,
        rx: cube.rox + cube.rrx * t,
        ry: cube.roy + cube.rry * t,
        size: cube.size,
    };
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
       largest cube reaches 0.45 closer than the centre does, and a small
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
 * Everything the canvas needs for one block in one frame: its six faces sorted
 * back to front, plus the shading scalar.
 *
 * Assembled here rather than in the component so the draw loop is a `fill()`
 * and a `stroke()` per face and nothing else — and so the sort order, which
 * is the part that goes wrong, is testable.
 *
 * NO DRAW LOOP CALLS THIS ANY MORE; `orderedFaces` below does, allocating
 * nothing. This is now the REFERENCE IMPLEMENTATION — the obvious, boring,
 * allocate-everything version that `cubes.test.ts` checks the fast path
 * against, vertex by vertex. That is a real job and it is why this stays:
 * a buffer-reusing projection with no independent statement of what it should
 * produce is a projection nobody can check. Keep the two in step; if this one
 * changes, the test will say so.
 *
 * It is also still the right call anywhere the caller needs every face of
 * every cube materialised at once — sorting a whole field by depth before
 * painting any of it, which is what the entrance used to do here.
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

/* ══════════════════════════════════════════════════════
   ORDERED FACES, WITHOUT THE GARBAGE

   `renderCube` above allocates 8 points, 6 quad arrays and 6 face records per
   call, then sorts them. That is correct and it is what the tests pin, but it
   is also what four separate draw loops were each doing per cube per frame:

     ZoneTitle   80 cubes    ~1,600 objects/frame
     GlyphA      27 cubes      ~540 objects/frame
     SignalGate  27 in burst   ~540 objects/frame
     NotFound    (its own)

   None of them keeps a face past the `fill()`/`stroke()` that draws it, so
   none of them needs a fresh one. `orderedFaces` does the same arithmetic
   into buffers that live for the life of the module and hands back the same
   far-to-near ordering.

   The one thing it cannot serve is a caller that wants every face of every
   cube at once — sorting a whole field by depth and only then painting it.
   The entrance did exactly that in three places; each now sorts the POSES and
   projects one cube at a time, which is the same order and the same pixels.

   THE RETURN VALUE IS SCRATCH SPACE AND THE NEXT CALL OVERWRITES IT. Draw
   from it before calling again; never store it, spread it, or hand it to
   anything that outlives the loop body. That constraint is the whole reason
   the allocating `renderCube` stays — it is the one to reach for anywhere
   this rule would be hard to honour.

   Insertion sort rather than `Array.prototype.sort`: six elements, already
   nearly ordered most frames, and no comparator closure allocated per call.
   ══════════════════════════════════════════════════════ */

/** `Pt2` is readonly by design — these buffers are the one place that writes
    them, so the mutable view is local and never escapes: `orderedFaces`
    returns them typed as `readonly Pt2[]`. */
type MutPt2 = { x: number; y: number; z: number };

const FACE_PTS: MutPt2[] = CUBE_VERTS.map(() => ({ x: 0, y: 0, z: 0 }));
const FACE_QUADS: MutPt2[][] = CUBE_FACES.map((idx) => new Array(idx.length));
const FACE_DEPTH = new Float64Array(CUBE_FACES.length);
const FACE_ORDER = new Uint8Array(CUBE_FACES.length);
const FACE_OUT: MutPt2[][] = new Array(CUBE_FACES.length);

/** `project`, writing into an existing point instead of returning a new one. */
function projectInto(v: Vec3, pose: Pose, w: number, h: number, out: MutPt2): void {
    const { rx, ry, size } = pose;

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
    const wz = Math.max(NEAR * 0.5, pose.z + z2 * size);

    const scale = (Math.min(w, h) * FOV) / wz;

    out.x = w / 2 + wx * scale;
    out.y = h / 2 - wy * scale;
    out.z = wz;
}

/**
 * One cube's six faces, deepest first, in reused buffers.
 *
 * Identical output to `renderCube(...).faces.map(f => f.pts)` — `cubes.test.ts`
 * asserts that against the allocating path so the two can never drift.
 */
export function orderedFaces(
    pose: Pose,
    w: number,
    h: number,
): readonly (readonly Pt2[])[] {
    for (let i = 0; i < CUBE_VERTS.length; i++) {
        projectInto(CUBE_VERTS[i], pose, w, h, FACE_PTS[i]);
    }

    for (let f = 0; f < CUBE_FACES.length; f++) {
        const idx = CUBE_FACES[f];
        const quad = FACE_QUADS[f];
        for (let k = 0; k < idx.length; k++) quad[k] = FACE_PTS[idx[k]];
        FACE_DEPTH[f] = faceDepth(quad);
        FACE_ORDER[f] = f;
    }

    for (let i = 1; i < FACE_ORDER.length; i++) {
        const v = FACE_ORDER[i];
        const d = FACE_DEPTH[v];
        let j = i - 1;
        while (j >= 0 && FACE_DEPTH[FACE_ORDER[j]] < d) {
            FACE_ORDER[j + 1] = FACE_ORDER[j];
            j--;
        }
        FACE_ORDER[j + 1] = v;
    }

    for (let f = 0; f < FACE_ORDER.length; f++) {
        FACE_OUT[f] = FACE_QUADS[FACE_ORDER[f]];
    }
    return FACE_OUT;
}
