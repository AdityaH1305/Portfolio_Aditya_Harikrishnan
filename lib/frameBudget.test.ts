import { test } from "node:test";
import assert from "node:assert/strict";
import {
    advance,
    createBudget,
    SAMPLE_WINDOW,
    DEGRADE_ABOVE_MS,
    RECOVER_BELOW_MS,
    DEGRADE_HOLD_MS,
    SAMPLE_CEILING_MS,
    type FrameBudget,
} from "./frameBudget.ts";

/** Feed n frames of `ms` each, advancing the clock by `ms` as we go. */
function run(b: FrameBudget, n: number, ms: number, max = 2, t0 = 0) {
    let now = t0;
    for (let i = 0; i < n; i++) {
        now += ms;
        b = advance(b, ms, now, max);
    }
    return { b, now };
}

test("a machine holding 60fps never leaves full quality", () => {
    const { b } = run(createBudget(), SAMPLE_WINDOW * 10, 16.7);
    assert.equal(b.level, 0);
});

test("the level does not move before a full window", () => {
    const { b } = run(createBudget(), SAMPLE_WINDOW - 1, 40);
    assert.equal(b.level, 0);
    assert.equal(b.samples, SAMPLE_WINDOW - 1);
});

test("sustained slow frames degrade, one level per window", () => {
    const first = run(createBudget(), SAMPLE_WINDOW, 40);
    assert.equal(first.b.level, 1);
    assert.ok(first.b.holdUntil > first.now, "a degrade arms a hold");
});

test("a completed window inside the hold is discarded, not acted on", () => {
    // NOTE the clock. 60 frames at 40ms is 2.4s of wall time, which already
    // outruns DEGRADE_HOLD_MS — so the hold only ever bites when frames are
    // fast enough for a window to close inside it, which is exactly the
    // oscillation case it exists for. Driven explicitly here rather than
    // through `run`, so the guarantee is tested rather than the arithmetic
    // of how long a window happens to take.
    let b = createBudget(1);
    b = { ...b, holdUntil: 10_000 };
    for (let i = 0; i < SAMPLE_WINDOW; i++) b = advance(b, 40, 1_000, 2);
    assert.equal(b.level, 1, "level frozen while held");
    assert.equal(b.samples, 0, "but the window still resets");
    assert.equal(b.accumMs, 0);
});

test("degrading is capped at maxLevel", () => {
    let b = createBudget();
    let now = 0;
    for (let w = 0; w < 12; w++) {
        const r = run(b, SAMPLE_WINDOW, 40, 2, now);
        b = r.b;
        now = r.now + DEGRADE_HOLD_MS; // clear the hold between windows
    }
    assert.equal(b.level, 2);
});

test("recovery is possible, and never below 0", () => {
    let b = createBudget(2);
    let now = 0;
    for (let w = 0; w < 12; w++) {
        const r = run(b, SAMPLE_WINDOW, 10, 2, now);
        b = r.b;
        now = r.now + DEGRADE_HOLD_MS * 4;
    }
    assert.equal(b.level, 0);
});

test("recovery is slower than degradation", () => {
    // One bad window from 0, one good window from 1, same clock.
    const bad = run(createBudget(0), SAMPLE_WINDOW, 40);
    const good = run(createBudget(1), SAMPLE_WINDOW, 10);
    assert.equal(bad.b.level, 1);
    assert.equal(good.b.level, 0);
    assert.ok(
        good.b.holdUntil - good.now > bad.b.holdUntil - bad.now,
        "a recovery must hold longer than a degrade",
    );
});

test("frames between the thresholds sit still", () => {
    // 21ms is above RECOVER_BELOW_MS and below DEGRADE_ABOVE_MS: the dead
    // band that stops the level oscillating around a 60Hz frame.
    assert.ok(21 > RECOVER_BELOW_MS && 21 < DEGRADE_ABOVE_MS);
    const { b } = run(createBudget(1), SAMPLE_WINDOW * 5, 21);
    assert.equal(b.level, 1);
});

test("a tab-restore stall is discarded, not averaged in", () => {
    // 59 good frames plus one enormous one. Averaged, that mean is far above
    // DEGRADE_ABOVE_MS and would drop the quality of a canvas holding 60fps.
    let b = createBudget();
    let now = 0;
    for (let i = 0; i < SAMPLE_WINDOW - 1; i++) {
        now += 16.7;
        b = advance(b, 16.7, now, 2);
    }
    const stall = SAMPLE_CEILING_MS + 800;
    now += stall;
    b = advance(b, stall, now, 2);
    assert.equal(b.level, 0, "one stall must not degrade a healthy machine");
    assert.equal(b.samples, SAMPLE_WINDOW - 1, "the stall is not counted");
});

test("a negative or NaN delta cannot corrupt the window", () => {
    const b0 = createBudget();
    assert.deepEqual(advance(b0, -5, 100, 2), b0);
    assert.deepEqual(advance(b0, NaN, 100, 2), b0);
});
