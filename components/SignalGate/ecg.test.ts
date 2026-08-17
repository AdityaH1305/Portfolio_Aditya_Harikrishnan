import test from "node:test";
import assert from "node:assert/strict";

import { ecgAt, sweepAt, peakAt, ECG_SAMPLES, ECG_PERIOD } from "./ecg.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/ecg.test.ts
   Pure module, so no DOM and no browser needed. */

const times = Array.from({ length: 60 }, (_, i) => i * 0.05);

test("the trace never leaves the canvas", () => {
    /* The component multiplies this by half the strip height. Anything outside
       -1…1 is drawn past the edge, and the clip is silent — the spike would
       just look flat-topped. */
    for (const t of times) {
        for (const live of [0, 0.5, 1]) {
            for (let i = 0; i < ECG_SAMPLES; i++) {
                const v = ecgAt(i / (ECG_SAMPLES - 1), t, live);
                assert.ok(
                    v >= -1 && v <= 1,
                    `${v} out of range at u=${i}, t=${t}, live=${live}`,
                );
            }
        }
    }
});

test("LOST IS A FLATLINE — that is the whole message", () => {
    /* The reader has to see "nothing is happening" without being told. If the
       dead state had real amplitude it would read as a working monitor and the
       fault would stop being legible. */
    for (const t of times) {
        assert.ok(
            peakAt(ECG_SAMPLES, t, 0) < 0.2,
            `dead trace peaked at ${peakAt(ECG_SAMPLES, t, 0)} at t=${t}`,
        );
    }
});

test("dead is not PERFECTLY flat", () => {
    // An occasional tick reads as "listening and finding nothing"; a true flat
    // line reads as "this element is broken too".
    const moved = times.some((t) => peakAt(ECG_SAMPLES, t, 0) > 0);
    assert.ok(moved, "the dead trace never ticks at all");
});

test("alive beats, and the R spike dominates the complex", () => {
    /* What makes the shape read as a heartbeat rather than a wobble. If R ever
       stops being the tallest feature the silhouette is wrong, and it is the
       silhouette doing the communicating. */
    let sawFullSpike = false;

    for (const t of times) {
        const peak = peakAt(ECG_SAMPLES, t, 1);
        if (peak > 0.9) sawFullSpike = true;
    }
    assert.ok(sawFullSpike, "the R spike never reached full height");

    // Sampled densely across one beat: R is at 0.32 and must beat P, T and S.
    const at = (beat: number) => {
        // u chosen so the beat position lands where we want at t = 0.
        const u = beat / 2;
        return ecgAt(u, 0, 1);
    };
    const r = at(0.32);
    for (const [name, pos] of [["P", 0.16], ["S", 0.355], ["T", 0.52]] as const) {
        assert.ok(
            r > Math.abs(at(pos)),
            `${name} (${at(pos)}) is not smaller than R (${r})`,
        );
    }
});

test("the rhythm repeats on its stated period", () => {
    // A monitor that drifts is a monitor nobody trusts.
    for (const t of times.slice(0, 20)) {
        for (const u of [0.1, 0.37, 0.62, 0.9]) {
            assert.ok(
                Math.abs(ecgAt(u, t, 1) - ecgAt(u, t + ECG_PERIOD, 1)) < 1e-9,
                `u=${u} differs one period apart at t=${t}`,
            );
        }
    }
});

test("most of a beat is baseline — the silence is what makes it an event", () => {
    const quiet = Array.from({ length: 200 }, (_, i) => ecgAt(i / 199, 0, 1))
        .filter((v) => Math.abs(v) < 0.05).length;
    assert.ok(quiet > 100, `only ${quiet}/200 samples were at baseline`);
});

test("the sweep head wraps without jumping backwards", () => {
    let prev = sweepAt(0);
    let wraps = 0;
    for (let i = 1; i <= 400; i++) {
        const p = sweepAt(i * 0.01);
        assert.ok(p >= 0 && p <= 1, `${p} out of 0…1`);
        if (p < prev) {
            wraps++;
            assert.ok(prev > 0.9 && p < 0.1, `jumped from ${prev} to ${p}`);
        }
        prev = p;
    }
    assert.ok(wraps > 0, "the head never completed a pass");
});

test("live ramps the trace up rather than switching it on", () => {
    // The component ramps `live` 0→1 over 320ms, so partial values have to be
    // meaningful — not just the two endpoints.
    const t = 0.16;
    const peaks = [0, 0.25, 0.5, 0.75, 1].map((l) => peakAt(ECG_SAMPLES, t, l));
    for (let i = 1; i < peaks.length; i++) {
        assert.ok(
            peaks[i] >= peaks[i - 1] - 1e-9,
            `peak fell from ${peaks[i - 1]} to ${peaks[i]}`,
        );
    }
    assert.ok(peaks[peaks.length - 1] > peaks[0], "full live is no taller than dead");
});

test("out-of-range live is clamped, not propagated", () => {
    assert.equal(ecgAt(0.3, 0.5, -3), ecgAt(0.3, 0.5, 0));
    assert.equal(ecgAt(0.3, 0.5, 9), ecgAt(0.3, 0.5, 1));
});

test("the trace is pure", () => {
    const once = Array.from({ length: 50 }, (_, i) => ecgAt(i / 49, 0.7, 1));
    const twice = Array.from({ length: 50 }, (_, i) => ecgAt(i / 49, 0.7, 1));
    assert.deepEqual(once, twice);
});
