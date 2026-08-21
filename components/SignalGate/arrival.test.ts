/* ══════════════════════════════════════════════════════
   The arrival — what has to be true

   Each case here is a failure that is invisible in code
   review and unwatchable in this environment: the browser
   pane never composites, so rAF is paused and the canvas
   never draws a frame. Stepping the arithmetic in node is
   not a substitute for watching it — for these particular
   claims it is stronger.
   ══════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";

import { KEEP_X, KEEP_Y, envFor, spawnField } from "./cubes.ts";
import {
    ARRIVE_DELAY,
    ARRIVE_MS,
    ARRIVE_STAGGER,
    ARRIVE_TOTAL,
    arriveAt,
    departureOf,
} from "./arrival.ts";

/* Seeded, so a failure is the same failure twice — the same shape
   `finale.test.ts` and `forces.test.ts` use. */
function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const VIEWPORTS = [
    { w: 1440, h: 900 },
    { w: 1280, h: 720 },
    { w: 1024, h: 1366 },
    { w: 375, h: 812 },
];

/** The field as the component builds it: 4 blocks on a phone, 6 otherwise. */
function fieldFor(w: number, h: number, seed = 11) {
    return spawnField(w < 768 ? 4 : 6, seeded(seed), w, h);
}

/* ══ The beat before anything moves ══════════════════ */

test("NOTHING MOVES BEFORE ARRIVE_DELAY", () => {
    /* The whole point of the change. The blocks used to appear whenever the
       chunk happened to land; the fixed beat is what makes the arrival read as
       designed rather than as loading. */
    for (const { w, h } of VIEWPORTS) {
        const field = fieldFor(w, h);
        const env = envFor(w, h);
        for (let ms = 0; ms <= ARRIVE_DELAY; ms += 25) {
            field.forEach((c, i) => {
                const d = arriveAt(c, i, field.length, ms, env);
                assert.equal(d.alpha, 0, `visible at ${ms}ms`);
            });
        }
    }
});

test("the field fills in around the ring, and all of it lands in time", () => {
    /* Index order is an angular sweep, because `spawnField` deals one slice
       each — so the stagger has to be monotone in `i` or the sweep becomes a
       scatter. */
    const n = 6;
    let prev = -Infinity;
    for (let i = 0; i < n; i++) {
        const t = departureOf(i, n);
        assert.ok(t > prev, `block ${i} does not follow ${i - 1}`);
        assert.ok(t >= ARRIVE_DELAY);
        assert.ok(t + ARRIVE_MS <= ARRIVE_TOTAL + 1e-9, "lands after the total");
        prev = t;
    }
    assert.equal(departureOf(0, n), ARRIVE_DELAY);
    assert.equal(departureOf(n - 1, n), ARRIVE_DELAY + ARRIVE_STAGGER);
    // A single block must not divide by zero.
    assert.equal(departureOf(0, 1), ARRIVE_DELAY);
});

/* ══ Off screen, then exactly home ═══════════════════ */

test("EVERY BLOCK STARTS OFF SCREEN", () => {
    /* "Floats in from outside the screen" is the request, and the start radius
       is chosen as a multiple of the CORNER distance precisely so this holds at
       every angle and every aspect ratio — the corner is the furthest point of
       the rectangle, so anything beyond it is outside at all angles. */
    for (const { w, h } of VIEWPORTS) {
        const field = fieldFor(w, h);
        const env = envFor(w, h);
        field.forEach((c, i) => {
            const d = arriveAt(c, i, field.length, departureOf(i, field.length), env);
            assert.ok(
                Math.abs(d.x) > env.halfX || Math.abs(d.y) > env.halfY,
                `block ${i} starts on screen at ${w}x${h}: ${d.x}, ${d.y}`,
            );
        });
    }
});

test("EVERY BLOCK LANDS EXACTLY WHERE THE PHYSICS EXPECTS IT", () => {
    /* The handover. `arriveAt` writes straight into `cube.x` / `cube.y`, and
       the first physics frame picks up from there — so a block that lands a
       float's width out twitches on that frame. Returning the resting values
       verbatim past `u = 1`, rather than recomputing them through polar, is
       what makes this bit-exact; the same reason `convergeAt(from, 0)` returns
       `from` one module over. */
    for (const { w, h } of VIEWPORTS) {
        const field = fieldFor(w, h);
        const env = envFor(w, h);
        field.forEach((c, i) => {
            for (const ms of [
                departureOf(i, field.length) + ARRIVE_MS,
                ARRIVE_TOTAL,
                ARRIVE_TOTAL + 5000,
            ]) {
                const d = arriveAt(c, i, field.length, ms, env);
                assert.equal(d.x, c.restX, `block ${i} x at ${ms}ms`);
                assert.equal(d.y, c.restY, `block ${i} y at ${ms}ms`);
                assert.equal(d.alpha, 1);
            }
        });
    }
});

test("everything has landed by ARRIVE_TOTAL", () => {
    for (const { w, h } of VIEWPORTS) {
        const field = fieldFor(w, h);
        const env = envFor(w, h);
        field.forEach((c, i) => {
            const d = arriveAt(c, i, field.length, ARRIVE_TOTAL, env);
            assert.equal(d.x, c.restX);
            assert.equal(d.y, c.restY);
        });
    }
});

/* ══ The path ════════════════════════════════════════ */

test("THE PATH NEVER CROSSES THE COPY", () => {
    /* `forces.test.ts` guards the keep-out ellipse for the steady state, with
       the pointer actively shoving blocks at the text. The arrival is the one
       thing that could fly a block straight across the headline instead, and
       the angular sweep makes it genuinely non-obvious: mid-flight a block is
       at a different angle from its resting one, and the ellipse is not a
       circle, so "it ends up outside" proves nothing about where it has been. */
    for (const { w, h } of VIEWPORTS) {
        const m = Math.min(w, h);
        const keepX = (KEEP_X * w) / m;
        const keepY = (KEEP_Y * h) / m;
        const env = envFor(w, h);

        for (let seed = 1; seed <= 6; seed++) {
            const field = fieldFor(w, h, seed);
            field.forEach((c, i) => {
                for (let ms = 0; ms <= ARRIVE_TOTAL; ms += 8) {
                    const d = arriveAt(c, i, field.length, ms, env);
                    const inside =
                        (d.x * d.x) / (keepX * keepX) +
                            (d.y * d.y) / (keepY * keepY) <
                        1;
                    assert.ok(
                        !inside,
                        `block ${i} entered the copy at ${ms}ms (${w}x${h}, seed ${seed})`,
                    );
                }
            });
        }
    }
});

test("blocks only ever come inward", () => {
    /* A block that drifts back out part way reads as a bug rather than as a
       flourish, and it is exactly what an eased angle plus an eased radius can
       produce if the two disagree. */
    for (const { w, h } of VIEWPORTS) {
        const field = fieldFor(w, h);
        const env = envFor(w, h);
        field.forEach((c, i) => {
            let prev = Infinity;
            for (let ms = departureOf(i, field.length); ms <= ARRIVE_TOTAL; ms += 8) {
                const d = arriveAt(c, i, field.length, ms, env);
                const r = Math.hypot(d.x, d.y);
                assert.ok(r <= prev + 1e-9, `block ${i} went back out at ${ms}ms`);
                prev = r;
            }
        });
    }
});

test("the arrival is smooth, not a jump", () => {
    /* Position is a function of `ms` rather than an accumulation, so there is
       no dt to clamp — but a discontinuity in the curve would still show. The
       step between consecutive frames must never spike. */
    const { w, h } = VIEWPORTS[0];
    const field = fieldFor(w, h);
    const env = envFor(w, h);

    field.forEach((c, i) => {
        let prev = arriveAt(c, i, field.length, 0, env);
        let peak = 0;
        for (let ms = 16; ms <= ARRIVE_TOTAL + 200; ms += 16) {
            const d = arriveAt(c, i, field.length, ms, env);
            peak = Math.max(peak, Math.hypot(d.x - prev.x, d.y - prev.y));
            prev = d;
        }
        // The whole trip is ~2 units; no single 16ms frame may cover a tenth
        // of it, which a discontinuity at the landing certainly would.
        assert.ok(peak < 0.2, `block ${i} jumped ${peak.toFixed(3)} in one frame`);
    });
});

test("blocks fade up and stay up", () => {
    for (const { w, h } of VIEWPORTS) {
        const field = fieldFor(w, h);
        const env = envFor(w, h);
        field.forEach((c, i) => {
            let prev = -1;
            for (let ms = 0; ms <= ARRIVE_TOTAL; ms += 8) {
                const a = arriveAt(c, i, field.length, ms, env).alpha;
                assert.ok(a >= prev - 1e-9, `block ${i} dimmed again at ${ms}ms`);
                assert.ok(a >= 0 && a <= 1);
                prev = a;
            }
            assert.equal(prev, 1);
        });
    }
});

test("a block is solid before it is on screen", () => {
    /* The fade exists so nothing hard-edges into view at a corner. It is
       useless if it is still running once the block is inside the frame. */
    for (const { w, h } of VIEWPORTS) {
        const field = fieldFor(w, h);
        const env = envFor(w, h);
        field.forEach((c, i) => {
            for (let ms = 0; ms <= ARRIVE_TOTAL; ms += 8) {
                const d = arriveAt(c, i, field.length, ms, env);
                const onScreen =
                    Math.abs(d.x) <= env.halfX && Math.abs(d.y) <= env.halfY;
                if (onScreen) {
                    assert.equal(d.alpha, 1, `block ${i} still fading at ${ms}ms`);
                }
            }
        });
    }
});
