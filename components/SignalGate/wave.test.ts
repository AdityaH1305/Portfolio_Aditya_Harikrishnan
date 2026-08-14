import test from "node:test";
import assert from "node:assert/strict";

import { waveAt, peakAt, WAVE_SAMPLES } from "./wave.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/wave.test.ts */

const N = WAVE_SAMPLES;
const TIMES = [0, 0.37, 1.5, 4.2, 17.9, 120];

test("output stays in range for every input thrown at it", () => {
    for (const t of TIMES) {
        for (const live of [0, 0.25, 0.5, 0.75, 1]) {
            for (let i = 0; i < N; i++) {
                const v = waveAt(i, N, t, live);
                assert.ok(v >= -1 && v <= 1, `${v} out of range`);
                assert.ok(Number.isFinite(v), "non-finite sample");
            }
        }
    }
});

test("liveness is clamped rather than trusted", () => {
    for (const t of TIMES) {
        assert.equal(waveAt(40, N, t, -5), waveAt(40, N, t, 0));
        assert.equal(waveAt(40, N, t, 9), waveAt(40, N, t, 1));
    }
});

test("a lost signal is essentially flat", () => {
    // Not perfectly flat: the occasional tick is the point. But it must read
    // as a baseline, so the vast majority of samples sit at zero.
    for (const t of TIMES) {
        let atZero = 0;
        for (let i = 0; i < N; i++) if (waveAt(i, N, t, 0) === 0) atZero++;
        assert.ok(
            atZero / N > 0.9,
            `only ${((atZero / N) * 100).toFixed(0)}% flat at t=${t}`,
        );
    }
});

test("a lost signal still ticks sometimes", () => {
    // If this ever goes quiet the trace reads as "nothing is running" rather
    // than "something is listening and finding nothing".
    let ticks = 0;
    for (let s = 0; s < 400; s++) {
        for (let i = 0; i < N; i++) if (waveAt(i, N, s / 6, 0) !== 0) ticks++;
    }
    assert.ok(ticks > 0, "the dead carrier never ticks");
});

test("a live signal is not flat", () => {
    for (const t of TIMES) {
        assert.ok(peakAt(N, t, 1) > 0.4, `live peak too low at t=${t}`);
    }
});

test("liveness actually scales the trace", () => {
    // The component ramps this, so it has to be monotonic enough that the
    // trace grows into life instead of popping.
    for (const t of [0.4, 3.3, 22]) {
        const quiet = peakAt(N, t, 0.15);
        const loud = peakAt(N, t, 1);
        assert.ok(loud > quiet, `t=${t}: ${loud} should exceed ${quiet}`);
    }
});

test("the trace resolves into the baseline at both ends", () => {
    // Otherwise it is visibly chopped off by the edge of the canvas.
    for (const t of TIMES) {
        assert.ok(Math.abs(waveAt(0, N, t, 1)) < 0.02, "left end not tapered");
        assert.ok(Math.abs(waveAt(N - 1, N, t, 1)) < 0.02, "right end not tapered");
    }
});

test("the same frame always draws the same", () => {
    for (const t of TIMES) {
        for (const i of [0, 1, 57, 199, N - 1]) {
            assert.equal(waveAt(i, N, t, 1), waveAt(i, N, t, 1));
            assert.equal(waveAt(i, N, t, 0), waveAt(i, N, t, 0));
        }
    }
});

test("a degenerate sample count does not divide by zero", () => {
    assert.equal(waveAt(0, 1, 5, 1), 0);
    assert.equal(waveAt(0, 0, 5, 1), 0);
});
