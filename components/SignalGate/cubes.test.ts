import test from "node:test";
import assert from "node:assert/strict";

import {
    CUBE_VERTS,
    CUBE_FACES,
    FADE_BAND,
    FAR,
    NEAR,
    SIZE_MAX,
    SIZE_MIN,
    SPREAD_X,
    SPREAD_Y,
    SWAY_MAX,
    depthFade,
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

const FIELD = spawnField(48, seeded(7));

/** Two minutes at 6 fps. Long enough that every cube has crossed a plane. */
const TIMES = Array.from({ length: 720 }, (_, i) => i * 0.1667);

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
    assert.deepEqual(spawnField(12, seeded(99)), spawnField(12, seeded(99)));
    assert.notDeepEqual(spawnField(12, seeded(99)), spawnField(12, seeded(100)));
    assert.equal(spawnField(0, seeded(1)).length, 0);
});

test("nothing spawns onto a fade plane", () => {
    /* Opening the screen on a block that is already invisible wastes it, and
       the first frame is the one frame everybody sees. */
    for (const c of FIELD) {
        assert.ok(
            c.oz >= NEAR + FADE_BAND - 1e-9 && c.oz <= FAR - FADE_BAND + 1e-9,
            `spawned at z=${c.oz}, inside a fade band`,
        );
        assert.ok(Math.abs(c.ox) <= SPREAD_X, `ox=${c.ox}`);
        assert.ok(Math.abs(c.oy) <= SPREAD_Y, `oy=${c.oy}`);
        assert.ok(c.size >= SIZE_MIN && c.size <= SIZE_MAX, `size=${c.size}`);
        assert.ok(Math.abs(c.dz) > 0, "a cube that never travels");
    }
});

test("the field stays inside the world at every instant", () => {
    for (const c of FIELD) {
        for (const t of TIMES) {
            const p = poseAt(c, t);
            assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
            assert.ok(
                Math.abs(p.x) <= SPREAD_X + SWAY_MAX + 1e-9,
                `x=${p.x} beyond ${SPREAD_X + SWAY_MAX}`,
            );
            assert.ok(
                Math.abs(p.y) <= SPREAD_Y + SWAY_MAX + 1e-9,
                `y=${p.y} beyond ${SPREAD_Y + SWAY_MAX}`,
            );
            assert.ok(p.z >= NEAR - 1e-9 && p.z <= FAR + 1e-9, `z=${p.z} outside the range`);
        }
    }
});

test("X AND Y NEVER JUMP — only depth wraps", () => {
    /* An earlier version drifted and wrapped all three axes. That cannot work:
       how far off-screen a given X sits depends on depth, so one wrap bound
       hides the jump for a near block and puts it in the middle of the frame
       for a far one. */
    const dt = 1 / 60;
    for (const c of FIELD) {
        for (let i = 0; i < 2000; i++) {
            const a = poseAt(c, i * dt);
            const b = poseAt(c, (i + 1) * dt);
            assert.ok(Math.abs(b.x - a.x) < 0.01, `x jumped ${Math.abs(b.x - a.x)}`);
            assert.ok(Math.abs(b.y - a.y) < 0.01, `y jumped ${Math.abs(b.y - a.y)}`);
        }
    }
});

test("EVERY DEPTH WRAP HAPPENS WHILE THE CUBE IS INVISIBLE", () => {
    /* The whole reason `depthFade` exists. Depth wraps so the field never
       empties and never respawns — but a wrap is a teleport, and a block
       winking out at one plane and in at the other is exactly what the eye
       catches on a screen the reader is meant to be reading past. */
    const dt = 1 / 60;
    let wraps = 0;

    for (const c of FIELD) {
        for (let i = 0; i < 4000; i++) {
            const a = poseAt(c, i * dt);
            const b = poseAt(c, (i + 1) * dt);
            if (Math.abs(b.z - a.z) > 1) {
                wraps++;
                assert.ok(
                    depthFade(a.z) < 1e-3 && depthFade(b.z) < 1e-3,
                    `wrapped at fade ${depthFade(a.z)} → ${depthFade(b.z)}`,
                );
            }
        }
    }
    assert.ok(wraps > 0, "no cube ever wrapped, so the guard proved nothing");
});

test("the fade envelope closes at both planes and opens between them", () => {
    assert.equal(depthFade(NEAR), 0);
    assert.equal(depthFade(FAR), 0);
    assert.ok(depthFade((NEAR + FAR) / 2) > 0.99);
    for (let z = NEAR; z <= FAR; z += 0.01) {
        const f = depthFade(z);
        assert.ok(f >= 0 && f <= 1, `fade ${f} out of range at z=${z}`);
    }
    // Out of range is clamped, not propagated — the same rule as ecgAt's live.
    assert.equal(depthFade(NEAR - 5), 0);
    assert.equal(depthFade(FAR + 5), 0);
});

test("nearness runs far → near across the range and clamps outside it", () => {
    assert.equal(nearness(FAR), 0);
    assert.equal(nearness(NEAR), 1);
    assert.ok(nearness(3) > nearness(5));
    assert.equal(nearness(FAR + 9), 0);
    assert.equal(nearness(NEAR - 9), 1);
});

test("the field is never mostly invisible", () => {
    /* The fade bands cost screen time. If they ate most of it the backdrop
       would be a nearly empty room with occasional blocks, which is a
       different — and worse — design than the one that was agreed. */
    let lit = 0;
    let total = 0;
    for (const c of FIELD) {
        for (const t of TIMES) {
            if (depthFade(poseAt(c, t).z) > 0.5) lit++;
            total++;
        }
    }
    assert.ok(lit / total > 0.6, `only ${((lit / total) * 100).toFixed(1)}% of cube-time is lit`);
});

test("projection stays finite and in front of the camera", () => {
    for (const [w, h] of VIEWPORTS) {
        for (const c of FIELD) {
            for (const t of TIMES) {
                const pose = poseAt(c, t);
                for (const v of CUBE_VERTS) {
                    const p = project(v, pose, w, h);
                    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), "NaN vertex");
                    assert.ok(p.z > 0, `vertex behind the camera at z=${p.z}`);
                }
            }
        }
    }
});

test("no visible block ever becomes a wall", () => {
    /* A cube filling the frame behind the headline stops being a backdrop.
       Only measured while the block is actually legible — the near fade band
       exists precisely so the monsters are the invisible ones.

       The bound is a fraction of min(w, h) because `project` scales by that,
       so this one number holds at every viewport. */
    let worst = 0;
    for (const [w, h] of VIEWPORTS) {
        const lim = Math.min(w, h);
        for (const c of FIELD) {
            for (const t of TIMES) {
                const pose = poseAt(c, t);
                if (depthFade(pose.z) < 0.5) continue;
                const pts = CUBE_VERTS.map((v) => project(v, pose, w, h));
                const xs = pts.map((p) => p.x);
                const ys = pts.map((p) => p.y);
                const span = Math.max(
                    Math.max(...xs) - Math.min(...xs),
                    Math.max(...ys) - Math.min(...ys),
                );
                worst = Math.max(worst, span / lim);
            }
        }
    }
    assert.ok(worst < 0.62, `a lit block spanned ${(worst * 100).toFixed(1)}% of the short edge`);
});

test("faces come back sorted back to front", () => {
    /* Painter's algorithm, and translucent fills make an out-of-order stack
       read as a cube turned inside out rather than as a bug. */
    for (const c of FIELD.slice(0, 12)) {
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

test("a frame is reproducible", () => {
    // No accumulated state anywhere. Same t, same picture — which is what
    // makes every assertion above mean something.
    const a = FIELD.map((c) => renderCube(c, 12.5, 1440, 900));
    const b = FIELD.map((c) => renderCube(c, 12.5, 1440, 900));
    assert.deepEqual(a, b);
});
