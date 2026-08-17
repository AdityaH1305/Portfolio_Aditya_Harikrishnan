import test from "node:test";
import assert from "node:assert/strict";

import {
    DAMP,
    KEEP_SOFT,
    MAX_DT,
    MAX_SPEED,
    OVERHANG,
    POINTER_ACCEL,
    POINTER_RADIUS,
    REPEL_ACCEL,
    REPEL_RANGE,
    WANDER_ACCEL,
    keepDepth,
    pairAccel,
    pointerAccel,
    projectOut,
    stepField,
    type Body,
    type Env,
} from "./forces.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/forces.test.ts

   A repulsion field has three classic failure modes and every one of them is
   invisible in code review: it gains energy and the blocks fly off, it loses
   energy and the screen quietly becomes a still image, or two bodies land on
   top of each other and the direction is 0/0. This file is the proof that none
   of those happen, and it runs in node — which is stronger than watching. */

function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

/** A 1440 × 900 desktop, in min(w, h) units. */
const DESKTOP: Env = {
    halfX: 720 / 900,
    halfY: 0.5,
    keepX: (0.28 * 1440) / 900,
    keepY: (0.3 * 900) / 900,
    pointer: null,
};

/** A 375 × 812 phone — portrait, so the short edge is the width. */
const PHONE: Env = {
    halfX: 0.5,
    halfY: 812 / 750,
    keepX: 0.28,
    keepY: (0.3 * 812) / 375,
    pointer: null,
};

/** A plausible field, scattered outside the keep-out to start. */
function field(n: number, env: Env, seed: number): Body[] {
    const rand = seeded(seed);
    const out: Body[] = [];
    for (let i = 0; i < n; i++) {
        const th = ((i + 0.5) / n) * Math.PI * 2;
        const rad = 1.15 + rand() * 0.3;
        out.push({
            x: Math.cos(th) * env.keepX * rad,
            y: Math.sin(th) * env.keepY * rad,
            vx: 0,
            vy: 0,
            r: 0.06 + rand() * 0.06,
            wx: rand() * Math.PI * 2,
            wy: rand() * Math.PI * 2,
        });
    }
    return out;
}

/** Run a field for `seconds` at 60fps, calling `check` after every frame. */
function simulate(
    bodies: Body[],
    env: Env,
    seconds: number,
    check?: (b: Body, frame: number) => void,
): void {
    const dt = 1 / 60;
    const frames = Math.round(seconds / dt);
    for (let f = 1; f <= frames; f++) {
        stepField(bodies, dt, f * dt, env);
        if (check) for (const b of bodies) check(b, f);
    }
}

/* ── The force itself ────────────────────────────────── */

test("repulsion reaches zero, and never pulls", () => {
    const ra = 0.08, rb = 0.06;
    const reach = (ra + rb) * REPEL_RANGE;

    // Beyond the reach: nothing at all. No action at a distance.
    for (const d of [reach, reach + 0.01, reach * 3, 10]) {
        const f = pairAccel(d, 0, 0, 0, ra, rb);
        assert.equal(f.ax, 0, `pulled at d=${d}`);
        assert.equal(f.ay, 0);
    }

    // Inside it: always outward, i.e. the same sign as the separation.
    for (let d = 0.001; d < reach; d += 0.002) {
        const f = pairAccel(d, 0, 0, 0, ra, rb);
        assert.ok(f.ax > 0, `not pushing apart at d=${d}`);
        assert.ok(f.ax <= REPEL_ACCEL + 1e-12, `overshot the cap at d=${d}`);
    }
});

test("repulsion rises monotonically as they close", () => {
    const ra = 0.07, rb = 0.07;
    let prev = 0;
    for (let d = (ra + rb) * REPEL_RANGE - 1e-4; d > 0.002; d -= 0.002) {
        const mag = pairAccel(d, 0, 0, 0, ra, rb).ax;
        assert.ok(mag >= prev - 1e-12, `fell from ${prev} to ${mag} at d=${d}`);
        prev = mag;
    }
});

test("EQUAL AND OPPOSITE", () => {
    /* Newton's third law is not decoration here: an asymmetric pair force adds
       net momentum every frame, and a field that gains momentum drifts as a
       whole until it is all piled against one wall. */
    const rand = seeded(3);
    for (let i = 0; i < 200; i++) {
        const ax = rand() - 0.5, ay = rand() - 0.5;
        const bx = rand() - 0.5, by = rand() - 0.5;
        const ra = 0.05 + rand() * 0.1, rb = 0.05 + rand() * 0.1;
        const f1 = pairAccel(ax, ay, bx, by, ra, rb);
        const f2 = pairAccel(bx, by, ax, ay, rb, ra);
        assert.ok(Math.abs(f1.ax + f2.ax) < 1e-12, "x not opposed");
        assert.ok(Math.abs(f1.ay + f2.ay) < 1e-12, "y not opposed");
    }
});

test("COINCIDENT BODIES DO NOT PRODUCE NaN", () => {
    // Should never happen. Must not be fatal when it does.
    const f = pairAccel(0.2, 0.3, 0.2, 0.3, 0.08, 0.08);
    assert.ok(Number.isFinite(f.ax) && Number.isFinite(f.ay));
    assert.ok(Math.hypot(f.ax, f.ay) > 0, "coincident bodies must still separate");

    const p = pointerAccel(0.1, 0.1, 0.1, 0.1);
    assert.ok(Number.isFinite(p.ax) && Number.isFinite(p.ay));
});

test("the pointer pushes AWAY, and only within its radius", () => {
    for (const d of [POINTER_RADIUS, POINTER_RADIUS + 0.01, 2]) {
        const f = pointerAccel(d, 0, 0, 0);
        assert.equal(f.ax, 0, `reached past its radius at d=${d}`);
    }
    for (let d = 0.001; d < POINTER_RADIUS; d += 0.005) {
        const f = pointerAccel(d, 0, 0, 0);
        assert.ok(f.ax > 0, `pulled the body in at d=${d}`);
        assert.ok(f.ax <= POINTER_ACCEL + 1e-12);
    }
});

/* ── The keep-out ────────────────────────────────────── */

test("projectOut puts a body exactly on the ellipse and stops it re-entering", () => {
    const kx = 0.45, ky = 0.3;
    const b: Body = { x: 0.1, y: 0.05, vx: -0.2, vy: -0.1, r: 0.07, wx: 0, wy: 0 };
    projectOut(b, kx, ky);

    assert.ok(Math.abs(keepDepth(b.x, b.y, kx, ky) - 1) < 1e-9, "not on the boundary");

    // The inward part of the velocity is gone; the tangential part survives.
    const nx = b.x / (kx * kx), ny = b.y / (ky * ky);
    const n = Math.hypot(nx, ny);
    const into = (b.vx * nx + b.vy * ny) / n;
    assert.ok(into > -1e-9, `still heading in at ${into}`);
});

test("a body at dead centre is still evicted", () => {
    const b: Body = { x: 0, y: 0, vx: 0, vy: 0, r: 0.07, wx: 0, wy: 0 };
    projectOut(b, 0.45, 0.3);
    assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y));
    assert.ok(keepDepth(b.x, b.y, 0.45, 0.3) >= 1 - 1e-9);
});

test("a body already outside is left alone", () => {
    const b: Body = { x: 0.9, y: 0.4, vx: -0.3, vy: 0.1, r: 0.07, wx: 0, wy: 0 };
    const before = { ...b };
    projectOut(b, 0.45, 0.3);
    assert.deepEqual(b, before);
});

/* ── The field over time ─────────────────────────────── */

test("NOTHING IS EVER ON THE COPY, at any viewport, for two minutes", () => {
    /* The promise the old fixed ring gave for free and free bodies do not.
       Checked after every one of 7200 frames, for every body, with the pointer
       parked inside the keep-out zone so it is actively shoving them at it. */
    for (const [name, env] of [["desktop", DESKTOP], ["phone", PHONE]] as const) {
        const hostile: Env = { ...env, pointer: { x: 0, y: 0 } };
        const bodies = field(6, env, 11);
        simulate(bodies, hostile, 120, (b, f) => {
            const k = keepDepth(b.x, b.y, env.keepX, env.keepY);
            assert.ok(k >= 1 - 1e-9, `${name}: on the copy at frame ${f}, depth ${k}`);
        });
    }
});

test("nothing escapes the frame", () => {
    for (const [name, env] of [["desktop", DESKTOP], ["phone", PHONE]] as const) {
        const bodies = field(6, env, 5);
        simulate(bodies, env, 60, (b, f) => {
            assert.ok(
                Math.abs(b.x) <= env.halfX + OVERHANG + 1e-9,
                `${name}: x=${b.x} at frame ${f}`,
            );
            assert.ok(
                Math.abs(b.y) <= env.halfY + OVERHANG + 1e-9,
                `${name}: y=${b.y} at frame ${f}`,
            );
        });
    }
});

test("THE FIELD CANNOT GAIN ENERGY", () => {
    /* The failure that ends with blocks streaking off the screen. Started from
       a deliberately terrible state — every body stacked in one place, fully
       overlapping, which is the maximum repulsion the field can ever produce. */
    const bodies: Body[] = Array.from({ length: 6 }, (_, i) => ({
        x: 0.6, y: 0.35, vx: 0, vy: 0, r: 0.09, wx: i, wy: i * 2,
    }));
    simulate(bodies, DESKTOP, 90, (b, f) => {
        const speed = Math.hypot(b.vx, b.vy);
        assert.ok(speed <= MAX_SPEED + 1e-9, `speed ${speed} at frame ${f}`);
        assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), `NaN at frame ${f}`);
    });
});

test("stacked bodies push apart", () => {
    const a: Body = { x: 0.6, y: 0.3, vx: 0, vy: 0, r: 0.08, wx: 0, wy: 0 };
    const b: Body = { x: 0.61, y: 0.3, vx: 0, vy: 0, r: 0.08, wx: 3, wy: 1 };
    const bodies = [a, b];
    const before = Math.hypot(a.x - b.x, a.y - b.y);
    simulate(bodies, DESKTOP, 2);
    const after = Math.hypot(a.x - b.x, a.y - b.y);
    assert.ok(after > before * 3, `only got from ${before} to ${after}`);
});

test("THE FIELD NEVER GOES STILL", () => {
    /* The opposite failure, and the quieter one: a damped repulsion system
       converges. Every body finds the spot where the pushes cancel, stops, and
       the backdrop silently becomes a still image that nobody can tell from a
       broken canvas. `WANDER_ACCEL` is what prevents it — this is the assertion
       that would catch someone tuning it to zero. */
    assert.ok(WANDER_ACCEL > 0, "the wander is what keeps this alive");

    const bodies = field(6, DESKTOP, 21);
    simulate(bodies, DESKTOP, 30); // let it settle as far as it wants to

    const start = bodies.map((b) => ({ x: b.x, y: b.y }));
    simulate(bodies, DESKTOP, 20);
    const moved = bodies.reduce(
        (sum, b, i) => sum + Math.hypot(b.x - start[i].x, b.y - start[i].y),
        0,
    );
    assert.ok(moved > 0.15, `the whole field moved only ${moved.toFixed(4)} units`);
});

test("A BACKGROUNDED TAB CANNOT DETONATE THE FIELD", () => {
    /* rAF hands back the whole time the reader was away. Thirty seconds of
       acceleration integrated in one step is a field that is simply gone. */
    const wild = field(6, DESKTOP, 9);
    const tame = field(6, DESKTOP, 9);

    stepField(wild, 30, 1, DESKTOP);
    stepField(tame, MAX_DT, 1, DESKTOP);

    for (let i = 0; i < wild.length; i++) {
        assert.ok(Math.abs(wild[i].x - tame[i].x) < 1e-12, "dt was not clamped");
        assert.ok(Math.abs(wild[i].y - tame[i].y) < 1e-12, "dt was not clamped");
    }
});

test("a zero or negative step is a no-op", () => {
    const bodies = field(4, DESKTOP, 2);
    const before = bodies.map((b) => ({ ...b }));
    stepField(bodies, 0, 5, DESKTOP);
    stepField(bodies, -1, 5, DESKTOP);
    assert.deepEqual(bodies, before);
});

test("the pointer actually moves the field", () => {
    // The other half of the pointer test: it must have a visible effect, not
    // just an allowed one.
    const near = field(6, DESKTOP, 33);
    const none = field(6, DESKTOP, 33);
    const withPointer: Env = { ...DESKTOP, pointer: { x: 0.62, y: 0.2 } };

    simulate(near, withPointer, 1.5);
    simulate(none, DESKTOP, 1.5);

    const drift = near.reduce(
        (sum, b, i) => sum + Math.hypot(b.x - none[i].x, b.y - none[i].y),
        0,
    );
    assert.ok(drift > 0.02, `the pointer barely registered: ${drift.toFixed(4)}`);
});

test("a frame is deterministic", () => {
    const a = field(6, DESKTOP, 77);
    const b = field(6, DESKTOP, 77);
    simulate(a, DESKTOP, 5);
    simulate(b, DESKTOP, 5);
    assert.deepEqual(a, b);
});

test("the constants stay in the range the tuning assumes", () => {
    // Guards against a retune that silently breaks the calm.
    assert.ok(DAMP > 0 && DAMP < 1, "damping must actually damp");
    assert.ok(KEEP_SOFT > 0, "the copy needs a soft approach, not just a wall");
    assert.ok(MAX_DT <= 0.05, "a larger clamp is a larger detonation");
    assert.ok(REPEL_RANGE > 1, "repulsion must start before bodies interpenetrate");
});
