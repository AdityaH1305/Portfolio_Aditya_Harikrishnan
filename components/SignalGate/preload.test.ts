/* ══════════════════════════════════════════════════════
   The loading ring — the arithmetic

   `preload.ts` owns every decision; `SignalGate.tsx` owns a canvas and a
   ticker. That split is what makes this testable at all, and it matters here
   more than usual: the dev browser pane never composites, so rAF never runs
   and NONE of this is observable there.

   Two of these tests are seams rather than properties — `formAt(from, ring,
   0) === from` and the ring's own pose at the handover. Both exist because a
   block that jumps at a phase boundary is the one failure in this family that
   is invisible in review and obvious on screen.

   Run:
     node --experimental-strip-types --test components/SignalGate/preload.test.ts
   ══════════════════════════════════════════════════════ */

import test from "node:test";
import assert from "node:assert/strict";

import {
    CAMERA_FLOOR,
    DIM,
    FORM_AT,
    FORM_MS,
    MAX_WAIT_MS,
    MIN_HOLD_MS,
    RING_RADIUS,
    RING_SIZE,
    RING_Z,
    SPIN_RATE,
    displayProgress,
    formAt,
    readyToMerge,
    ringNearestZ,
    ringPose,
    ringScreenRadius,
    ringScreenSpan,
    segmentAlpha,
} from "./preload.ts";
import { EXIT_MS, CONVERGE_AT } from "./gate.ts";
import { MERGE_SIZE, MERGE_Z, convergeAt } from "./finale.ts";
import { SIZE_MAX, type Pose } from "./cubes.ts";

const VIEWPORTS = [
    { w: 2560, h: 1440 },
    { w: 1440, h: 900 },
    { w: 1280, h: 720 },
    { w: 1024, h: 768 },
    { w: 812, h: 375 }, // landscape phone — the tightest case
    { w: 375, h: 812 },
    { w: 320, h: 568 },
];

/** The field spawns 4 below 768px wide and 6 above — both must work. */
const COUNTS = [4, 6];

/* ── The formation ───────────────────────────────────── */

test("the ring is centred and evenly divided", () => {
    for (const n of COUNTS) {
        for (const t of [0, 1.7, 40]) {
            let sx = 0;
            let sy = 0;
            const angles: number[] = [];

            for (let i = 0; i < n; i++) {
                const p = ringPose(i, n, t);
                sx += p.x;
                sy += p.y;
                // every block is exactly on the ring
                assert.ok(
                    Math.abs(Math.hypot(p.x, p.y) - RING_RADIUS) < 1e-9,
                    `n=${n} i=${i} is off the ring`,
                );
                assert.equal(p.z, RING_Z);
                assert.equal(p.size, RING_SIZE);
                angles.push(Math.atan2(p.y, p.x));
            }

            // The centroid is the origin, so the collapse has nowhere to drift.
            assert.ok(Math.abs(sx) < 1e-9, `n=${n} centroid x = ${sx}`);
            assert.ok(Math.abs(sy) < 1e-9, `n=${n} centroid y = ${sy}`);

            // Equal spacing: every adjacent gap is 2π/n.
            const want = (Math.PI * 2) / n;
            for (let i = 0; i < n; i++) {
                const a = angles[i];
                const b = angles[(i + 1) % n];
                let gap = b - a;
                while (gap <= 0) gap += Math.PI * 2;
                assert.ok(
                    Math.abs(gap - want) < 1e-9,
                    `n=${n} gap ${gap} != ${want}`,
                );
            }
        }
    }
});

test("the ring turns, and keeps turning without going bad", () => {
    const a0 = Math.atan2(ringPose(0, 6, 0).y, ringPose(0, 6, 0).x);
    const a1 = Math.atan2(ringPose(0, 6, 1).y, ringPose(0, 6, 1).x);
    assert.notEqual(a0, a1, "the ring is static");

    /* Rotation is unbounded in `t` on purpose — `convergeAt` runs it through
       `nearestTurn`. What must not happen is a NaN or an Infinity after a
       reader leaves the entrance open for a very long time. */
    for (const t of [1e3, 1e5, 1e6]) {
        const p = ringPose(2, 6, t);
        for (const v of [p.x, p.y, p.z, p.rx, p.ry, p.size]) {
            assert.ok(Number.isFinite(v), `t=${t} produced ${v}`);
        }
        assert.ok(Math.abs(Math.hypot(p.x, p.y) - RING_RADIUS) < 1e-9);
    }

    assert.ok(SPIN_RATE > 0);
});

test("NOTHING ON THE RING CROSSES THE CAMERA", () => {
    /* The ring is flat in z, so the only thing reaching toward the camera is
       a corner of a turning block — at most size * sqrt(3) closer than the
       centre. `finale.test.ts` guards the same property for the debris. */
    assert.ok(
        ringNearestZ() > CAMERA_FLOOR,
        `nearest ${ringNearestZ()} vs floor ${CAMERA_FLOOR}`,
    );

    for (const n of COUNTS) {
        for (let t = 0; t < 20; t += 0.37) {
            for (let i = 0; i < n; i++) {
                assert.ok(ringPose(i, n, t).z > CAMERA_FLOOR);
            }
        }
    }
});

test("the ring fits, and leaves room for the readout beneath it", () => {
    /* `.signal-gate-progress` sits at 87% of viewport height. If the ring
       reaches that far the number lands inside the formation. The landscape
       phone is the binding case at 23px of clearance. */
    const READOUT_FRAC = 0.87;

    for (const { w, h } of VIEWPORTS) {
        const half = ringScreenSpan(w, h) + ringScreenRadius(w, h);
        assert.ok(2 * half < w, `${w}x${h}: ring is wider than the viewport`);
        assert.ok(2 * half < h, `${w}x${h}: ring is taller than the viewport`);

        const clear = h * READOUT_FRAC - (h / 2 + half);
        assert.ok(clear > 15, `${w}x${h}: only ${clear.toFixed(0)}px of clearance`);

        // And it must not be so small it reads as a dot.
        assert.ok(
            ringScreenRadius(w, h) >= 20,
            `${w}x${h}: blocks are ${ringScreenRadius(w, h).toFixed(0)}px`,
        );
    }
});

test("THE SIZE CHAIN IS MONOTONE — the collapse never changes direction", () => {
    /* field block → ring block → merged cube must grow throughout, or the
       gather visibly shrinks the blocks partway before growing them again. */
    assert.ok(
        SIZE_MAX < RING_SIZE,
        `field max ${SIZE_MAX} is not smaller than ring ${RING_SIZE}`,
    );
    assert.ok(
        RING_SIZE < MERGE_SIZE,
        `ring ${RING_SIZE} is not smaller than merged ${MERGE_SIZE}`,
    );
    // And the ring sits between the field and the merged cube in depth too.
    assert.ok(MERGE_Z < RING_Z, "the ring must be further than the merged cube");
});

/* ── The two seams ───────────────────────────────────── */

test("A BLOCK DOES NOT JUMP WHEN THE RING FORMS", () => {
    /* The physics runs right up to FORM_AT and the first morph frame has to
       draw what the last physics frame would have. `convergeAt` carries the
       identical contract at the other end, and `finale.test.ts` asserts it
       there for the same reason. */
    const from: Pose = {
        x: 0.41,
        y: -0.28,
        z: 4.9,
        rx: 19.5,
        ry: -7.2,
        size: 0.21,
    };
    const ring = ringPose(3, 6, 1.4);
    const at0 = formAt(from, ring, 0);

    for (const k of ["x", "y", "z", "rx", "ry", "size"] as const) {
        assert.equal(at0[k], from[k], `${k} jumped at u=0`);
    }
});

test("the morph lands exactly on the ring", () => {
    const from: Pose = { x: -1.1, y: 0.6, z: 5.4, rx: 3, ry: 2, size: 0.15 };
    for (const n of COUNTS) {
        for (let i = 0; i < n; i++) {
            const ring = ringPose(i, n, 0.9);
            const at1 = formAt(from, ring, 1);
            for (const k of ["x", "y", "z", "rx", "ry", "size"] as const) {
                assert.ok(
                    Math.abs(at1[k] - ring[k]) < 1e-9,
                    `${k}: ${at1[k]} vs ${ring[k]}`,
                );
            }
        }
    }
});

test("the morph is clamped and never leaves the world", () => {
    const from: Pose = { x: 2, y: -2, z: 6, rx: 0, ry: 0, size: 0.14 };
    const ring = ringPose(0, 6, 0);
    assert.deepEqual(formAt(from, ring, -4), formAt(from, ring, 0));
    assert.deepEqual(formAt(from, ring, 9), formAt(from, ring, 1));

    for (let u = 0; u <= 1.0001; u += 0.02) {
        const p = formAt(from, ring, u);
        assert.ok(p.z > CAMERA_FLOOR, `u=${u} put a block at z=${p.z}`);
        for (const v of [p.x, p.y, p.z, p.size]) assert.ok(Number.isFinite(v));
    }
});

test("THE RING COLLAPSES INTO ONE CUBE, not six near-misses", () => {
    /* The whole design rests on the ring's poses being the gather's `from`
       poses, so the existing convergence has to survive being handed them.
       This is `finale.test.ts`'s identity assertion, re-run against ring
       input rather than physics input. */
    for (const n of COUNTS) {
        const ends = Array.from({ length: n }, (_, i) =>
            convergeAt(ringPose(i, n, 3.3), 1),
        );
        const first = ends[0];
        for (const p of ends) {
            for (const k of ["x", "y", "z", "rx", "ry", "size"] as const) {
                assert.ok(
                    Math.abs(p[k] - first[k]) < 1e-9,
                    `${k} differs: ${p[k]} vs ${first[k]}`,
                );
            }
        }
        assert.ok(Math.abs(first.x) < 1e-9 && Math.abs(first.y) < 1e-9);
        assert.ok(Math.abs(first.z - MERGE_Z) < 1e-9);
        assert.ok(Math.abs(first.size - MERGE_SIZE) < 1e-9);
    }
});

test("the gather takes the short way round even after a long wait", () => {
    /* A block's ring rotation grows without bound while loading runs. That is
       exactly the hazard `nearestTurn` was added for; this proves a long load
       cannot reintroduce it. */
    for (const t of [0.5, 30, 300, 3000]) {
        const from = ringPose(1, 6, t);
        let prev = convergeAt(from, 0);
        let travel = 0;
        for (let u = 0.02; u <= 1.0001; u += 0.02) {
            const p = convergeAt(from, u);
            travel += Math.abs(p.rx - prev.rx);
            prev = p;
        }
        assert.ok(
            travel <= Math.PI + 1e-6,
            `t=${t}: the merge unwound ${travel.toFixed(2)} rad`,
        );
    }
});

/* ── The ring as a meter ─────────────────────────────── */

test("segments light in order and never unlight", () => {
    for (const n of COUNTS) {
        for (let i = 0; i < n; i++) {
            let prev = -Infinity;
            for (let p = 0; p <= 1.0001; p += 0.01) {
                const a = segmentAlpha(i, n, p);
                assert.ok(a >= DIM - 1e-9 && a <= 1 + 1e-9, `alpha ${a}`);
                assert.ok(a >= prev - 1e-9, `segment ${i} dimmed at p=${p}`);
                prev = a;
            }
        }

        // Nothing is dark at the start; everything is lit at the end.
        for (let i = 0; i < n; i++) {
            assert.ok(segmentAlpha(i, n, 0) >= DIM - 1e-9);
            assert.ok(
                Math.abs(segmentAlpha(i, n, 1) - 1) < 1e-9,
                `segment ${i} is not fully lit at 100%`,
            );
        }

        // And they light in order — earlier segments lead later ones.
        for (let i = 1; i < n; i++) {
            assert.ok(
                segmentAlpha(i - 1, n, 0.5) >= segmentAlpha(i, n, 0.5),
                "segments are lighting out of order",
            );
        }
    }
    assert.ok(DIM > 0, "an unlit segment must still be visible");
});

test("out-of-range progress is clamped, not propagated", () => {
    assert.equal(segmentAlpha(0, 6, -3), segmentAlpha(0, 6, 0));
    assert.equal(segmentAlpha(5, 6, 9), segmentAlpha(5, 6, 1));
});

/* ── The progress curve ──────────────────────────────── */

test("THE NUMBER NEVER GOES BACKWARDS", () => {
    /* Promise.allSettled reports in completion order, and a bar that ticks
       backwards reads as broken even when the underlying count is right. */
    let prev = -1;
    for (let ms = 0; ms <= MIN_HOLD_MS * 2; ms += 10) {
        const real = Math.min(1, ms / 400); // work finishing early
        const shown = displayProgress(real, ms);
        assert.ok(shown >= prev - 1e-12, `dropped at ${ms}ms`);
        assert.ok(shown >= 0 && shown <= 1, `out of range: ${shown}`);
        prev = shown;
    }
});

test("A WARM CACHE STILL GETS THE FULL BEAT", () => {
    /* The three imports settle in ~100-300ms warm. Without the floor the ring
       would appear and vanish inside a quarter of a second. */
    assert.ok(displayProgress(1, 0) < 1);
    assert.ok(displayProgress(1, MIN_HOLD_MS / 2) < 1);
    assert.ok(Math.abs(displayProgress(1, MIN_HOLD_MS) - 1) < 1e-9);
    assert.ok(!readyToMerge(1, MIN_HOLD_MS - 1), "handed over early");
    assert.ok(readyToMerge(1, MIN_HOLD_MS), "did not hand over on time");
});

test("a slow load holds the ring, however long it takes", () => {
    // Work not done: never ready, and never shows 100%, at any elapsed time.
    for (const ms of [MIN_HOLD_MS, 3000, 60_000]) {
        assert.ok(!readyToMerge(0.66, ms), `handed over at ${ms}ms unfinished`);
        assert.ok(displayProgress(0.66, ms) <= 0.66 + 1e-9);
    }
});

test("THE NUMBER IS CAPPED BY BOTH THE WORK AND THE CLOCK", () => {
    /* `min(real, paced)`. Either term alone is wrong: the clock alone would
       let it claim 100% before anything had loaded, and the work alone would
       let a warm cache flash past. Expressed against MIN_HOLD_MS rather than
       absolute milliseconds, so retiming the beat does not silently retune
       what this is asserting. */

    // The work caps it — no number without something behind it.
    assert.equal(displayProgress(0, 200), 0, "claimed progress with none made");
    assert.equal(
        displayProgress(0.25, MIN_HOLD_MS * 4),
        0.25,
        "outran the work once the clock was satisfied",
    );

    // The clock caps it — a finished load still crosses the whole beat.
    assert.equal(displayProgress(1, 0), 0);
    assert.ok(
        Math.abs(displayProgress(1, MIN_HOLD_MS / 2) - 0.5) < 1e-9,
        "did not track the beat at its halfway point",
    );

    // And between them it is always a real fraction.
    for (const real of [0, 0.33, 0.66, 1]) {
        for (const ms of [0, 300, MIN_HOLD_MS, MIN_HOLD_MS * 2]) {
            const v = displayProgress(real, ms);
            assert.ok(v >= 0 && v <= 1, `real=${real} ms=${ms} gave ${v}`);
            assert.ok(v <= real + 1e-9, "showed more than had loaded");
        }
    }
});

/* ── The schedule ────────────────────────────────────── */

test("the ring starts forming before the copy has finished leaving", () => {
    /* The same overlap `gate.test.ts` asserts for the gather, and the same
       reason: text out THEN cubes in reads as two steps. */
    assert.ok(FORM_AT < EXIT_MS, `${FORM_AT} vs ${EXIT_MS}`);
    assert.ok(FORM_AT > 0, "must not start on the frame of the press");
    assert.equal(FORM_AT, CONVERGE_AT, "the two openings should share a beat");
});

test("THE FORMED RING GETS TIME OF ITS OWN", () => {
    /* The point of the floor is not merely that the loader exists — it is
       that the ASSEMBLED ring is on screen long enough to be watched and its
       number read. The morph does not finish until FORM_AT + FORM_MS, so a
       floor only slightly above that leaves the ring formed for a few frames
       and the whole beat is blocks still travelling.

       At MIN_HOLD_MS 900 that residue was ~20ms, which is what prompted
       raising it. 500ms is the floor below which this stops being a beat
       somebody can take in. */
    const formed = MIN_HOLD_MS - (FORM_AT + FORM_MS);
    assert.ok(
        formed >= 500,
        `the assembled ring is only up for ${formed}ms before the handover`,
    );

    // The morph must still complete inside the hold, or the handover lands
    // while blocks are mid-flight into the ring.
    assert.ok(
        FORM_AT + FORM_MS <= MIN_HOLD_MS,
        `morph ends at ${FORM_AT + FORM_MS}ms but the floor is ${MIN_HOLD_MS}ms`,
    );

    /* And it must not become an endurance test. The finale adds ~2.3s after
       this, so the whole entrance is MIN_HOLD_MS + FINALE_MS on a warm cache. */
    assert.ok(MIN_HOLD_MS <= 2000, `${MIN_HOLD_MS}ms is too long to hold a stranger`);
});

test("the ceiling leaves real room for a slow load, and is still bounded", () => {
    /* Expressed as the GAP rather than as a ratio. A ratio was the first form
       and it was the wrong invariant: raising the floor to 2000 made
       `MAX_WAIT_MS > MIN_HOLD_MS * 3` read 6000 > 6000 and fail, even though
       four full seconds of waiting room is obviously plenty. What matters is
       how much genuine slow-connection headroom sits beyond the beat, not the
       proportion between the two. */
    assert.ok(
        MAX_WAIT_MS - MIN_HOLD_MS >= 3000,
        `only ${MAX_WAIT_MS - MIN_HOLD_MS}ms of headroom beyond the beat`,
    );
    assert.ok(MAX_WAIT_MS <= 10_000, "nobody should wait this long");
});
