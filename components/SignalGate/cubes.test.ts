import test from "node:test";
import assert from "node:assert/strict";

import {
    CUBE_FACES,
    CUBE_VERTS,
    FAR,
    KEEP_X,
    KEEP_Y,
    NEAR,
    SIZE_MAX,
    SIZE_MIN,
    collisionRadius,
    depthAt,
    envFor,
    faceDepth,
    nearness,
    orderedFaces,
    poseAt,
    project,
    renderCube,
    spawnField,
} from "./cubes.ts";
import { keepDepth, stepField, type Env } from "./forces.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/cubes.test.ts

   Geometry only. Where the blocks GO is forces.test.ts; this covers the parts
   that decide what they look like once they are there — and the one seam
   between the two, which is that a block's collision radius has to match the
   size it is actually drawn at. */

function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

const VIEWPORTS: readonly [number, number][] = [
    [1440, 900],
    [1920, 1080],
    [375, 812],
    [768, 1024],
];

/** Ten minutes at 6fps — well past anything a reader would sit through. */
const TIMES = Array.from({ length: 3600 }, (_, i) => i * 0.1667);

test("the face table is a closed cube", () => {
    assert.equal(CUBE_VERTS.length, 8);
    assert.equal(CUBE_FACES.length, 6);

    const uses = new Array(8).fill(0);
    for (const face of CUBE_FACES) {
        assert.equal(face.length, 4, "a quad that is not a quad");
        assert.equal(new Set(face).size, 4, "a face repeats a vertex");
        for (const i of face) {
            assert.ok(i >= 0 && i < 8, `vertex index ${i} out of range`);
            uses[i]++;
        }
    }
    // Every corner of a cube meets exactly three faces. If one meets two or
    // four the solid has a hole or a doubled face, and translucent fills make
    // either of those obvious the moment it renders.
    for (const [i, n] of uses.entries()) {
        assert.equal(n, 3, `corner ${i} is used by ${n} faces, not 3`);
    }
});

test("a field is reproducible from its seed", () => {
    assert.deepEqual(
        spawnField(6, seeded(99), 1440, 900),
        spawnField(6, seeded(99), 1440, 900),
    );
    assert.notDeepEqual(
        spawnField(6, seeded(99), 1440, 900),
        spawnField(6, seeded(100), 1440, 900),
    );
    assert.equal(spawnField(0, seeded(1), 1440, 900).length, 0);
});

test("NOTHING SPAWNS ON THE COPY", () => {
    /* The physics keeps them off it thereafter; this is about frame one, which
       is the frame everybody sees. */
    for (const [w, h] of VIEWPORTS) {
        const env = envFor(w, h);
        for (const c of spawnField(6, seeded(7), w, h)) {
            const k = keepDepth(c.x, c.y, env.keepX, env.keepY);
            assert.ok(k >= 1, `${w}×${h}: spawned at depth ${k.toFixed(3)}`);
        }
    }
});

test("blocks start spread around the copy, not clumped", () => {
    /* Six independent random positions clump — that is what random does, and
       at six blocks one clump is the whole composition. Each gets its own
       slice of the circle and may only wander inside it. */
    const n = 6;
    const angles = spawnField(n, seeded(7), 1440, 900)
        .map((c) => (Math.atan2(c.y, c.x) + Math.PI * 2) % (Math.PI * 2))
        .sort((a, b) => a - b);

    const slice = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
        const gap =
            i === n - 1 ? angles[0] + Math.PI * 2 - angles[i] : angles[i + 1] - angles[i];
        assert.ok(
            gap >= slice * 0.4,
            `two blocks opened ${((gap * 180) / Math.PI).toFixed(1)}° apart`,
        );
    }
});

test("sizes and depths stay in range", () => {
    for (const c of spawnField(6, seeded(3), 1440, 900)) {
        assert.ok(c.size >= SIZE_MIN && c.size <= SIZE_MAX, `size=${c.size}`);
        for (const t of TIMES) {
            const z = depthAt(c, t);
            assert.ok(z > NEAR && z < FAR, `z=${z} outside the planes at t=${t}`);
        }
    }
});

test("DEPTH NEVER JUMPS", () => {
    // Bounded oscillation, not a wrap — so no alpha envelope is needed to hide
    // a teleport, and at six blocks an envelope would be taking a sixth of the
    // composition off screen at a time.
    const dt = 1 / 60;
    for (const c of spawnField(6, seeded(15), 1440, 900)) {
        let prev = depthAt(c, 0);
        for (let i = 1; i <= 6000; i++) {
            const z = depthAt(c, i * dt);
            assert.ok(Math.abs(z - prev) < 0.01, `depth jumped ${Math.abs(z - prev)}`);
            prev = z;
        }
    }
});

test("every block stays lit — none fades to nothing", () => {
    for (const c of spawnField(6, seeded(4), 1440, 900)) {
        for (const t of TIMES) {
            const n = nearness(depthAt(c, t));
            assert.ok(n > 0.05 && n <= 1, `nearness ${n} at t=${t}`);
        }
    }
});

test("THE COLLISION RADIUS TRACKS WHAT IS DRAWN", () => {
    /* The seam between this module and forces.ts, and the one place a bug here
       would be invisible in both. If the radius handed to the physics is
       smaller than the block on screen, blocks visibly overlap before anything
       pushes; much larger and they barge each other across a gap.

       This caught exactly that: the first version passed the FACE half-extent
       and the drawn silhouette reached 2.2× further.

       Two assertions, and the second is the real one. A sensible band is easy
       to hit by luck; a TIGHT SPREAD of the ratio across every viewport, depth
       and size is what proves the radius is actually derived from the drawing
       rather than coincidentally near it. */
    const ratios: number[] = [];

    for (const [w, h] of VIEWPORTS) {
        const m = Math.min(w, h);
        for (const c of spawnField(6, seeded(23), w, h)) {
            for (const t of [0, 4.5, 37, 300]) {
                const z = depthAt(c, t);
                const pose = poseAt(c, t, w, h);
                const pts = CUBE_VERTS.map((v) => project(v, pose, w, h));
                const cx = w / 2 + c.x * m;
                const cy = h / 2 + c.y * m;
                const reach =
                    Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) / m;
                const r = collisionRadius(c, z);

                assert.ok(r > 0 && Number.isFinite(r), `bad radius ${r}`);
                assert.ok(
                    r >= reach * 0.45 && r <= reach * 1.05,
                    `radius ${r.toFixed(4)} against a reach of ${reach.toFixed(4)}`,
                );
                ratios.push(r / reach);
            }
        }
    }

    const spread = Math.max(...ratios) / Math.min(...ratios);
    assert.ok(spread < 1.6, `the ratio wandered by ${spread.toFixed(2)}×`);
});

test("the pose keeps a block where the physics put it, at any viewport", () => {
    /* Depth is divided back out. Skip that and perspective drags every block
       toward the middle of the frame as it recedes — and the middle of the
       frame is the copy. */
    for (const [w, h] of VIEWPORTS) {
        const m = Math.min(w, h);
        for (const c of spawnField(6, seeded(31), w, h)) {
            for (const t of [0, 7.3, 61, 400]) {
                const p = project({ x: 0, y: 0, z: 0 }, poseAt(c, t, w, h), w, h);
                assert.ok(
                    Math.abs(p.x - (w / 2 + c.x * m)) < 1e-6,
                    `x drifted from where the physics put it`,
                );
                assert.ok(
                    Math.abs(p.y - (h / 2 + c.y * m)) < 1e-6,
                    `y drifted from where the physics put it`,
                );
            }
        }
    }
});

test("projection stays finite and in front of the camera", () => {
    for (const [w, h] of VIEWPORTS) {
        for (const c of spawnField(6, seeded(8), w, h)) {
            for (const t of TIMES) {
                const pose = poseAt(c, t, w, h);
                for (const v of CUBE_VERTS) {
                    const p = project(v, pose, w, h);
                    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), "NaN vertex");
                    assert.ok(p.z > 0, `vertex behind the camera at z=${p.z}`);
                }
            }
        }
    }
});

test("no block ever becomes a wall", () => {
    /* A cube filling the frame stops being a backdrop. The bound is a fraction
       of min(w, h) because `project` scales by that, so this one number holds
       at every viewport. `SIZE_MAX` and `NEAR` are what it measures. */
    let worst = 0;
    for (const [w, h] of VIEWPORTS) {
        const lim = Math.min(w, h);
        for (const c of spawnField(6, seeded(12), w, h)) {
            for (const t of TIMES) {
                const pts = CUBE_VERTS.map((v) => project(v, poseAt(c, t, w, h), w, h));
                const xs = pts.map((p) => p.x);
                const ys = pts.map((p) => p.y);
                worst = Math.max(
                    worst,
                    (Math.max(...xs) - Math.min(...xs)) / lim,
                    (Math.max(...ys) - Math.min(...ys)) / lim,
                );
            }
        }
    }
    assert.ok(worst < 0.55, `a block spanned ${(worst * 100).toFixed(1)}% of the short edge`);
});

test("faces come back sorted back to front", () => {
    /* Painter's algorithm, and translucent fills make an out-of-order stack
       read as a cube turned inside out rather than as a bug. */
    for (const c of spawnField(6, seeded(6), 1440, 900)) {
        for (const t of [0, 3.7, 41.2, 300.9]) {
            const { faces } = renderCube(c, t, 1440, 900);
            assert.equal(faces.length, 6);
            for (const f of faces) assert.equal(f.pts.length, 4);
            for (let i = 1; i < faces.length; i++) {
                assert.ok(
                    faces[i - 1].depth >= faces[i].depth,
                    `face ${i} is nearer than the one drawn after it`,
                );
            }
        }
    }
});

test("faceDepth is the mean, and survives an empty quad", () => {
    assert.equal(faceDepth([]), 0);
    assert.equal(
        faceDepth([
            { x: 0, y: 0, z: 2 },
            { x: 0, y: 0, z: 4 },
        ]),
        3,
    );
});

test("nearness runs far → near and clamps outside the range", () => {
    assert.equal(nearness(FAR), 0);
    assert.equal(nearness(NEAR), 1);
    assert.ok(nearness(3) > nearness(5));
    assert.equal(nearness(FAR + 9), 0);
    assert.equal(nearness(NEAR - 9), 1);
});

test("envFor converts the viewport into the physics' units", () => {
    // Landscape: the short edge is the height, so halfY is exactly 0.5.
    const d = envFor(1440, 900);
    assert.equal(d.halfY, 0.5);
    assert.ok(Math.abs(d.halfX - 0.8) < 1e-9);
    assert.ok(Math.abs(d.keepX - (KEEP_X * 1440) / 900) < 1e-9);

    // Portrait: it is the width, so halfX is 0.5 and the keep-out is taller
    // than it is wide — as the copy column is.
    const p = envFor(375, 812);
    assert.equal(p.halfX, 0.5);
    assert.ok(p.keepY > p.keepX, "the exclusion zone should be tall on a phone");

    // The exclusion zone always fits inside the frame, or nothing could
    // satisfy both constraints at once.
    for (const [w, h] of VIEWPORTS) {
        const e = envFor(w, h);
        assert.ok(e.keepX < e.halfX, `${w}×${h}: keep-out wider than the frame`);
        assert.ok(e.keepY < e.halfY, `${w}×${h}: keep-out taller than the frame`);
    }
});

test("A LIVE FIELD STAYS OFF THE COPY AND ON THE SCREEN", () => {
    /* The two modules together, driven the way the component drives them:
       radii refreshed from depth every frame, the pointer parked on the copy
       so it is actively shoving blocks at the text. */
    for (const [w, h] of VIEWPORTS) {
        const base = envFor(w, h);
        const env: Env = { ...base, pointer: { x: 0, y: 0 } };
        const cubes = spawnField(6, seeded(42), w, h);
        const dt = 1 / 60;

        for (let f = 1; f <= 3600; f++) {
            const t = f * dt;
            for (const c of cubes) c.r = collisionRadius(c, depthAt(c, t));
            stepField(cubes, dt, t, env);

            for (const c of cubes) {
                assert.ok(
                    keepDepth(c.x, c.y, base.keepX, base.keepY) >= 1 - 1e-9,
                    `${w}×${h}: on the copy at frame ${f}`,
                );
                assert.ok(
                    Number.isFinite(c.x) && Number.isFinite(c.y),
                    `${w}×${h}: NaN at frame ${f}`,
                );
            }
        }
    }
});

/* ── The reused-buffer path is the allocating path ──
   `orderedFaces` exists purely so four draw loops stop allocating ~20 objects
   per cube per frame. It is only worth having if it is EXACTLY what
   `renderCube` would have drawn — a projection that is merely close would show
   as the silhouette shifting by a fraction of a pixel between the two code
   paths, which is invisible in review and invisible in a screenshot.

   Checked over the same field, times and viewports the sort-order test above
   uses, so any pose those reach this reaches too. */
test("ORDERED FACES MATCH THE ALLOCATING RENDERER EXACTLY", () => {
    for (const [w, h] of VIEWPORTS) {
        const field = spawnField(6, seeded(7), w, h);
        for (const cube of field) {
            for (const t of [0, 3.5, 61.25, 900.5]) {
                const pose = poseAt(cube, t, w, h);
                const want = renderCube(cube, t, w, h).faces;
                const got = orderedFaces(pose, w, h);

                assert.equal(got.length, want.length);
                for (let f = 0; f < want.length; f++) {
                    const a = want[f].pts;
                    const b = got[f];
                    assert.equal(b.length, a.length, `face ${f} vertex count`);
                    for (let k = 0; k < a.length; k++) {
                        assert.equal(b[k].x, a[k].x, `face ${f} pt ${k} x`);
                        assert.equal(b[k].y, a[k].y, `face ${f} pt ${k} y`);
                        assert.equal(b[k].z, a[k].z, `face ${f} pt ${k} z`);
                    }
                }
            }
        }
    }
});

/* The buffers are shared, so a second call must not corrupt a first result
   that is still being read — it MUST, which is the contract, and this pins the
   contract rather than pretending otherwise. A caller that stores the return
   value gets the next cube's faces; the comment on `orderedFaces` says so and
   this is the executable form of that warning. */
test("orderedFaces returns scratch space, and the next call overwrites it", () => {
    const [w, h] = VIEWPORTS[0];
    const field = spawnField(6, seeded(11), w, h);
    const first = orderedFaces(poseAt(field[0], 0, w, h), w, h);
    const snapshot = first[0][0].x;
    orderedFaces(poseAt(field[1], 0, w, h), w, h);
    assert.notEqual(
        first[0][0].x,
        snapshot,
        "two different cubes should not project identically — if they do, pick another pair",
    );
});
