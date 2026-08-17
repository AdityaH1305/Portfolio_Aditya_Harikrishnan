import test from "node:test";
import assert from "node:assert/strict";

import {
    CUBE_FACES,
    CUBE_VERTS,
    FAR,
    KEEP_X,
    KEEP_Y,
    NEAR,
    RING_MAX,
    RING_MIN,
    SIZE_MAX,
    SIZE_MIN,
    anchorAt,
    depthAt,
    faceDepth,
    nearness,
    poseAt,
    project,
    renderCube,
    spawnField,
} from "./cubes.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/cubes.test.ts
   Pure module, so no DOM and no browser needed — which is the point. This
   paints behind the alert screen's copy, and every way it can go wrong is
   either invisible in code review or only findable by watching the screen for
   a couple of minutes. */

/** Deterministic RNG, so a field is a fixed object and not a roll. */
function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

/** The two counts the component actually ships: desktop and phone. */
const FIELDS = [spawnField(6, seeded(7)), spawnField(4, seeded(31))];
const ALL = FIELDS.flat();

/** Ten minutes at 5 fps — well past a full lap of the ring. */
const TIMES = Array.from({ length: 3000 }, (_, i) => i * 0.2);

const VIEWPORTS: readonly [number, number][] = [
    [1440, 900],
    [1920, 1080],
    [375, 812],
    [768, 1024],
];

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
    assert.deepEqual(spawnField(6, seeded(99)), spawnField(6, seeded(99)));
    assert.notDeepEqual(spawnField(6, seeded(99)), spawnField(6, seeded(100)));
    assert.equal(spawnField(0, seeded(1)).length, 0);
});

test("NOTHING IS EVER DRAWN ON THE COPY", () => {
    /* The headline complaint about the first version, and the reason the ring
       exists: thirty cubes at uniformly random world positions put most of
       them across the middle of the screen, so the title, the trace and the
       button each had a block behind them.

       Stated in viewport FRACTIONS, so this one assertion holds at 375px and
       at 1920px and everywhere between. */
    for (const c of ALL) {
        for (const t of TIMES) {
            const { fx, fy } = anchorAt(c, t);
            const d = Math.hypot(fx / KEEP_X, fy / KEEP_Y);
            assert.ok(d >= 1 - 1e-9, `a cube reached ${d.toFixed(3)} of the keep-out at t=${t}`);
        }
    }
});

test("…and nothing wanders off the screen either", () => {
    /* The other half. A ring pushed far enough out to clear the copy is a
       ring whose blocks are outside the frame, and six cubes is few enough
       that losing one to the margin is a visible hole. */
    const limX = RING_MAX * KEEP_X;
    const limY = RING_MAX * KEEP_Y;
    assert.ok(limX < 0.5 && limY < 0.5, "the ring itself reaches past the frame");

    for (const c of ALL) {
        for (const t of TIMES) {
            const { fx, fy, r } = anchorAt(c, t);
            assert.ok(r >= RING_MIN - 1e-9 && r <= RING_MAX + 1e-9, `radius ${r}`);
            assert.ok(Math.abs(fx) <= limX + 1e-9, `fx=${fx}`);
            assert.ok(Math.abs(fy) <= limY + 1e-9, `fy=${fy}`);
        }
    }
});

test("BEARINGS ARE DEALT, NOT ROLLED", () => {
    /* Six independent random bearings clump — that is what random does, and
       with a field this small one clump is the whole composition. Each cube
       gets its own slice and may only wander inside it. */
    for (const field of FIELDS) {
        const n = field.length;
        const slice = (Math.PI * 2) / n;
        const angles = field
            .map((c) => ((c.theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2))
            .sort((a, b) => a - b);

        for (let i = 0; i < n; i++) {
            const gap = i === n - 1
                ? angles[0] + Math.PI * 2 - angles[i]
                : angles[i + 1] - angles[i];
            assert.ok(
                gap >= slice * 0.5 - 1e-9,
                `two of ${n} cubes sat ${((gap * 180) / Math.PI).toFixed(1)}° apart`,
            );
        }
    }
});

test("no cube starts level with the middle of the copy", () => {
    /* The half-slice offset. At `i / n` a six-cube field puts blocks at 0 and
       π — dead level with the headline, one either side.

       AND THE COUNT HAS TO BE EVEN for the offset to do that. This test was
       written against 6 and 5, and the five-cube phone field failed it
       immediately: five slices offset by a half still puts a bearing on 180°.
       The phone count is 4. */
    for (const field of FIELDS) {
        assert.equal(field.length % 2, 0, "an odd count defeats the half-slice offset");
        for (const c of field) {
            const th = ((c.theta % Math.PI) + Math.PI) % Math.PI;
            assert.ok(
                Math.min(th, Math.PI - th) > 0.25,
                `a cube opened at ${((th * 180) / Math.PI).toFixed(1)}° off the copy's axis`,
            );
        }
    }
});

test("DEPTH OSCILLATES AND NEVER WRAPS", () => {
    /* No seam, so no alpha envelope is needed to hide one — which matters at
       six cubes, where an envelope closing to zero takes a sixth of the
       composition off the screen at a time. */
    const dt = 1 / 60;
    for (const c of ALL) {
        let prev = depthAt(c, 0);
        for (let i = 1; i <= 6000; i++) {
            const z = depthAt(c, i * dt);
            assert.ok(z > NEAR && z < FAR, `z=${z} outside the planes`);
            assert.ok(Math.abs(z - prev) < 0.01, `depth jumped ${Math.abs(z - prev)}`);
            prev = z;
        }
    }
});

test("every cube stays lit — none fades to nothing", () => {
    for (const c of ALL) {
        for (const t of TIMES) {
            const n = nearness(depthAt(c, t));
            assert.ok(n > 0.05 && n <= 1, `nearness ${n} at t=${t}`);
        }
    }
});

test("sizes stay inside their range", () => {
    for (const c of ALL) {
        assert.ok(c.size >= SIZE_MIN && c.size <= SIZE_MAX, `size=${c.size}`);
    }
});

test("the anchor is what decides where a cube lands, at any viewport", () => {
    /* Screen-anchored, not world-anchored. Anchor in world space instead and
       the projection pulls a cube toward the middle of the frame as it
       recedes — every one of them ends up crossing the copy eventually, which
       is the exact problem the ring was introduced to fix. */
    for (const [w, h] of VIEWPORTS) {
        for (const c of ALL) {
            for (const t of [0, 7.3, 61, 400]) {
                const a = anchorAt(c, t);
                const p = project({ x: 0, y: 0, z: 0 }, poseAt(c, t, w, h), w, h);
                assert.ok(
                    Math.abs(p.x - (w / 2 + a.fx * w)) < 1e-6,
                    `x drifted from its anchor: ${p.x} vs ${w / 2 + a.fx * w}`,
                );
                assert.ok(
                    Math.abs(p.y - (h / 2 + a.fy * h)) < 1e-6,
                    `y drifted from its anchor: ${p.y} vs ${h / 2 + a.fy * h}`,
                );
            }
        }
    }
});

test("projection stays finite and in front of the camera", () => {
    for (const [w, h] of VIEWPORTS) {
        for (const c of ALL) {
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
    /* A cube filling the frame stops being a backdrop. The bound is a
       fraction of min(w, h) because `project` scales by that, so this one
       number holds at every viewport. `SIZE_MAX` and `NEAR` are what it is
       measuring; raising either is what fails it. */
    let worst = 0;
    for (const [w, h] of VIEWPORTS) {
        const lim = Math.min(w, h);
        for (const c of ALL) {
            for (const t of TIMES) {
                const pose = poseAt(c, t, w, h);
                const pts = CUBE_VERTS.map((v) => project(v, pose, w, h));
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
    for (const c of ALL) {
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

test("a frame is reproducible", () => {
    // No accumulated state anywhere. Same t, same picture — which is what
    // makes every assertion above mean something.
    const a = ALL.map((c) => renderCube(c, 12.5, 1440, 900));
    const b = ALL.map((c) => renderCube(c, 12.5, 1440, 900));
    assert.deepEqual(a, b);
});
