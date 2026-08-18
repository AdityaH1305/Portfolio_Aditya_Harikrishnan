import test from "node:test";
import assert from "node:assert/strict";

import {
    AXIS_CELLS,
    FRAGMENT_COUNT,
    MERGE_RX,
    MERGE_RY,
    MERGE_SIZE,
    MERGE_Z,
    convergeAt,
    debrisAt,
    easeInOut,
    easeOut,
    poseOf,
    shatter,
} from "./finale.ts";
import { CUBE_VERTS, NEAR, project, spawnField, type Pose } from "./cubes.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/finale.test.ts

   This sequence plays ONCE, lasts two seconds, and is the last thing between a
   stranger and the site. Nobody is going to catch a fragment that never fades
   or a convergence that lands a few pixels short by watching it go past — and
   both are trivially assertable, which is the whole reason this module is
   separate from the component that draws it. */

function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

const FRAGS = shatter(seeded(11));
const STEPS = Array.from({ length: 121 }, (_, i) => i / 120);

/* ── The lattice ─────────────────────────────────────── */

test("THE FRAGMENTS TILE THE CUBE EXACTLY AT REST", () => {
    /* The whole effect lives here. A burst that begins as a cloud of pieces
       near the middle is a particle effect; a burst that begins as a solid
       coming apart is a shatter, and the difference is entirely whether the
       cells fill the cube at u = 0. */
    assert.equal(FRAGS.length, FRAGMENT_COUNT);
    assert.equal(FRAGMENT_COUNT, AXIS_CELLS ** 3);

    const step = 2 / AXIS_CELLS;
    const half = step / 2;

    // Every centre sits on the expected grid, and every cell is distinct.
    const seen = new Set<string>();
    for (const f of FRAGS) {
        for (const [axis, v] of [["x", f.ox], ["y", f.oy], ["z", f.oz]] as const) {
            const idx = (v + 1 - half) / step;
            assert.ok(
                Math.abs(idx - Math.round(idx)) < 1e-9,
                `${axis}=${v} is not on the lattice`,
            );
            assert.ok(idx >= -1e-9 && idx <= AXIS_CELLS - 1 + 1e-9, `${axis}=${v} out of range`);
        }
        const key = [f.ox, f.oy, f.oz].map((v) => v.toFixed(6)).join(",");
        assert.ok(!seen.has(key), `two fragments share cell ${key}`);
        seen.add(key);
    }

    // And they fill it: the union of the cells is exactly the cube.
    let minV = Infinity;
    let maxV = -Infinity;
    for (const f of FRAGS) {
        for (const v of [f.ox, f.oy, f.oz]) {
            minV = Math.min(minV, v - half);
            maxV = Math.max(maxV, v + half);
        }
    }
    assert.ok(Math.abs(minV + 1) < 1e-9, `cells start at ${minV}, not -1`);
    assert.ok(Math.abs(maxV - 1) < 1e-9, `cells end at ${maxV}, not 1`);
});

test("at u = 0 every fragment is still inside the cube", () => {
    // Same claim, checked through the real `debrisAt` rather than the lattice
    // — the two could disagree, and only this one is what gets drawn.
    const cell = MERGE_SIZE / AXIS_CELLS;
    for (const f of FRAGS) {
        const { pose, alpha } = debrisAt(f, 0);
        assert.equal(alpha, 1, "the burst must not begin already fading");
        assert.ok(Math.abs(pose.x) <= MERGE_SIZE + 1e-9, `x=${pose.x}`);
        assert.ok(Math.abs(pose.y) <= MERGE_SIZE + 1e-9, `y=${pose.y}`);
        assert.ok(Math.abs(pose.z - MERGE_Z) <= MERGE_SIZE + 1e-9, `z=${pose.z}`);
        assert.ok(Math.abs(pose.size - cell) < 1e-9, "a fragment is not a cell");
    }
});

/* ── The burst ───────────────────────────────────────── */

test("FRAGMENTS ONLY EVER TRAVEL OUTWARD", () => {
    /* Anything that drifts back toward the centre reads as the explosion
       reassembling, which is the one thing it must not look like. */
    for (const f of FRAGS) {
        let prev = -Infinity;
        for (const u of STEPS) {
            const { pose } = debrisAt(f, u);
            const d = Math.hypot(pose.x, pose.y, pose.z - MERGE_Z);
            assert.ok(d >= prev - 1e-9, `came back in at u=${u}: ${d} after ${prev}`);
            prev = d;
        }
    }
});

test("EVERYTHING IS GONE BY THE END", () => {
    // The gate unmounts the instant the burst finishes. Anything still opaque
    // at u = 1 pops out of existence in front of the reader.
    for (const f of FRAGS) {
        assert.equal(debrisAt(f, 1).alpha, 0, "a fragment survived the burst");
    }
    // …and it got there smoothly, not in one step at the end.
    for (const f of FRAGS.slice(0, 6)) {
        let prev = 1;
        for (const u of STEPS) {
            const a = debrisAt(f, u).alpha;
            assert.ok(a <= prev + 1e-9, `alpha rose at u=${u}`);
            assert.ok(prev - a < 0.2, `alpha dropped ${prev - a} in one step at u=${u}`);
            prev = a;
        }
    }
});

test("a fragment thrown at the camera never crosses it", () => {
    /* The loud failure: a piece that passes the camera plane projects to a
       wild coordinate and streaks a polygon across the whole screen, in the
       middle of the one gesture that has to be clean. */
    for (const f of FRAGS) {
        for (const u of STEPS) {
            const { pose } = debrisAt(f, u);
            assert.ok(pose.z > NEAR * 0.5, `z=${pose.z} at u=${u}`);
            for (const [w, h] of [[1440, 900], [375, 812]] as const) {
                for (const v of CUBE_VERTS) {
                    const p = project(v, pose, w, h);
                    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), "NaN vertex");
                    assert.ok(p.z > 0, `vertex behind the camera at u=${u}`);
                }
            }
        }
    }
});

test("FRAGMENTS SHRINK AS THEY GO", () => {
    /* Without it the burst reads as a field of cubes rather than as debris:
       each piece is a third of the merged cube, about the size of one of the
       six blocks that formed it, so in flight they just look like more of the
       same object arranged differently. */
    for (const f of FRAGS.slice(0, 8)) {
        let prev = Infinity;
        for (const u of STEPS) {
            const { pose } = debrisAt(f, u);
            assert.ok(pose.size <= prev + 1e-9, `grew at u=${u}`);
            assert.ok(pose.size > 0, `size ${pose.size} at u=${u}`);
            prev = pose.size;
        }
        const start = debrisAt(f, 0).pose.size;
        assert.ok(
            debrisAt(f, 1).pose.size < start * 0.6,
            "a fragment barely shrank at all",
        );
    }
});

test("NOTHING RUSHES THE CAMERA", () => {
    /* Depth travel is damped and the centre cell — the one with no direction
       of its own — is aimed sideways. Straight at the viewer it grew to fill a
       third of the frame while everything else was leaving, which reads as
       aggressive rather than as an explosion seen from a distance. */
    const cell = MERGE_SIZE / AXIS_CELLS;
    /* The baseline is the NEAREST a fragment can legitimately sit at rest —
       the front layer of the lattice, one half-extent closer than the cube's
       own centre. Measuring against the centre instead fails at u = 0 on
       correct geometry, which is how I first wrote it. */
    const largestAtRest = cell / (MERGE_Z - MERGE_SIZE);

    for (const f of FRAGS) {
        for (const u of STEPS) {
            const { pose } = debrisAt(f, u);
            const apparent = pose.size / pose.z;
            assert.ok(
                apparent <= largestAtRest + 1e-9,
                `grew on screen at u=${u}: ${apparent} against ${largestAtRest}`,
            );
        }
    }
});

test("the burst is fastest at the moment it happens", () => {
    // Decelerating travel. A linear burst reads as a diagram of an explosion.
    const f = FRAGS[0];
    const at = (u: number) => {
        const { pose } = debrisAt(f, u);
        return Math.hypot(pose.x, pose.y, pose.z - MERGE_Z);
    };
    const early = at(0.15) - at(0);
    const late = at(1) - at(0.85);
    assert.ok(early > late * 2, `early ${early} vs late ${late}`);
});

test("a burst is reproducible from its seed", () => {
    assert.deepEqual(shatter(seeded(4)), shatter(seeded(4)));
    assert.notDeepEqual(shatter(seeded(4)), shatter(seeded(5)));
});

test("out-of-range progress is clamped, not propagated", () => {
    for (const f of FRAGS.slice(0, 4)) {
        assert.deepEqual(debrisAt(f, -3), debrisAt(f, 0));
        assert.deepEqual(debrisAt(f, 9), debrisAt(f, 1));
    }
});

/* ── The convergence ─────────────────────────────────── */

test("SIX BLOCKS BECOME ONE CUBE, NOT SIX NEARLY-ALIGNED ONES", () => {
    /* "Nearly the same" would show as a soft, multiplied edge rather than a
       single solid — and at six translucent blocks it would look like a
       rendering bug rather than a design choice. */
    const field = spawnField(6, seeded(7), 1440, 900);
    const starts = field.map((c, i) => poseOf(c, 3 + i * 0.4, i * 0.7));

    const ends = starts.map((p) => convergeAt(p, 1));
    const first = ends[0];
    for (const p of ends) {
        for (const key of ["x", "y", "z", "rx", "ry", "size"] as const) {
            assert.ok(
                Math.abs(p[key] - first[key]) < 1e-9,
                `${key} differs: ${p[key]} vs ${first[key]}`,
            );
        }
    }
    assert.ok(Math.abs(first.x) < 1e-9 && Math.abs(first.y) < 1e-9, "not centred");
    assert.ok(Math.abs(first.z - MERGE_Z) < 1e-9);
    assert.ok(Math.abs(first.size - MERGE_SIZE) < 1e-9);
    assert.ok(Math.abs(first.rx - MERGE_RX) < 1e-9);
    assert.ok(Math.abs(first.ry - MERGE_RY) < 1e-9);
});

test("a block does not jump at the moment the gather starts", () => {
    /* At u = 0 the convergence must return where the block already is, or all
       six twitch on the first frame of the sequence. The draw loop leans on
       this directly: the physics runs right up to `CONVERGE_AT` and the first
       gather frame has to draw what the last physics frame would have.

       Position, depth and size are exact. ROTATION IS COMPARED MODULO A FULL
       TURN, because `convergeAt` now rewrites the start angle to the
       equivalent one nearest the merge target — same angle on screen, since
       the projection only ever takes a sine and a cosine of it, but a
       different number. That rewrite is what stops a reader who left the
       entrance open for five minutes watching the cube unwind six revolutions
       into place. */
    const from: Pose = { x: 0.7, y: -0.3, z: 4.1, rx: 1.2, ry: -0.6, size: 0.21 };
    const at0 = convergeAt(from, 0);

    assert.equal(at0.x, from.x);
    assert.equal(at0.y, from.y);
    assert.equal(at0.z, from.z);
    assert.equal(at0.size, from.size);

    const TAU = Math.PI * 2;
    const sameTurn = (a: number, b: number) => {
        const d = Math.abs(((a - b) % TAU) + TAU) % TAU;
        return Math.min(d, TAU - d) < 1e-9;
    };
    assert.ok(sameTurn(at0.rx, from.rx), `rx ${at0.rx} vs ${from.rx}`);
    assert.ok(sameTurn(at0.ry, from.ry), `ry ${at0.ry} vs ${from.ry}`);
});

test("THE GATHER TAKES THE SHORT WAY ROUND, HOWEVER LONG THE WAIT", () => {
    /* A block's rotation is `rox + rrx * t`, and `t` is the ticker's elapsed
       seconds since page load. Nothing bounds it. Lerping that raw scalar to
       `MERGE_RX` unwound the whole accumulated angle inside the 900ms gather:
       ~1.5 turns if pressed after 30 seconds, ~3 after two minutes, ~6 after
       five. The merge looked different depending on how long somebody had sat
       there, and no constant in this file could have fixed that, because the
       one deciding it was the clock.

       Nothing here used to bound the path between the two endpoints — the
       seeded case below only reaches t < 4s, and the identity and no-jump
       cases each check a single value of `u`. */
    for (const wound of [0.3, 6.9, 19.5, 40, -33.2]) {
        const from: Pose = {
            x: 0.4,
            y: 0.2,
            z: 4,
            rx: wound,
            ry: -wound,
            size: 0.2,
        };

        let prevX = convergeAt(from, 0).rx;
        let prevY = convergeAt(from, 0).ry;
        let travelX = 0;
        let travelY = 0;

        for (let u = 0.01; u <= 1.0001; u += 0.01) {
            const p = convergeAt(from, u);
            travelX += Math.abs(p.rx - prevX);
            travelY += Math.abs(p.ry - prevY);
            prevX = p.rx;
            prevY = p.ry;
        }

        assert.ok(
            travelX <= Math.PI + 1e-6,
            `rx turned ${travelX} rad from a start of ${wound}`,
        );
        assert.ok(
            travelY <= Math.PI + 1e-6,
            `ry turned ${travelY} rad from a start of ${-wound}`,
        );

        // And it still lands exactly on the merged angle, which is what keeps
        // the six blocks one cube rather than six nearly-aligned ones.
        assert.ok(Math.abs(convergeAt(from, 1).rx - MERGE_RX) < 1e-9);
        assert.ok(Math.abs(convergeAt(from, 1).ry - MERGE_RY) < 1e-9);
    }
});

test("the convergence is monotone — nothing overshoots the centre", () => {
    const from: Pose = { x: 0.9, y: 0.5, z: 5.2, rx: 0.1, ry: 2.4, size: 0.18 };
    let prev = Infinity;
    for (const u of STEPS) {
        const p = convergeAt(from, u);
        const d = Math.hypot(p.x, p.y);
        assert.ok(d <= prev + 1e-9, `moved back out at u=${u}`);
        prev = d;
    }
    // Size grows the whole way, never dips.
    let prevSize = -Infinity;
    for (const u of STEPS) {
        const s = convergeAt(from, u).size;
        assert.ok(s >= prevSize - 1e-9, `size shrank at u=${u}`);
        prevSize = s;
    }
});

test("poseOf matches what the field would have drawn", () => {
    /* The seam: the convergence starts from where a block actually IS, and the
       field stores screen anchors with depth multiplied back in at draw time.
       Get this wrong and every block jumps at the press. */
    const field = spawnField(6, seeded(19), 1440, 900);
    for (const c of field) {
        for (const [z, t] of [[3.2, 0], [5.5, 12.4]] as const) {
            const p = poseOf(c, z, t);
            const k = z / 1.15; // FOV
            assert.ok(Math.abs(p.x - c.x * k) < 1e-12);
            assert.ok(Math.abs(p.y + c.y * k) < 1e-12, "Y must be negated: world is up");
            assert.equal(p.size, c.size);
        }
    }
});

test("the eases are well-behaved at their ends", () => {
    for (const f of [easeOut, easeInOut]) {
        assert.equal(f(0), 0);
        assert.equal(f(1), 1);
        assert.equal(f(-5), 0);
        assert.equal(f(5), 1);
        let prev = -Infinity;
        for (const u of STEPS) {
            const v = f(u);
            assert.ok(v >= prev - 1e-12, "not monotone");
            assert.ok(v >= 0 && v <= 1, `${v} out of range`);
            prev = v;
        }
    }
});
