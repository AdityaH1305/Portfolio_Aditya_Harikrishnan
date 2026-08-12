import test from "node:test";
import assert from "node:assert/strict";

import {
    MAX_FLING,
    DRAG_DECAY,
    FREE_MAX_S,
    OFFSCREEN_GRACE_S,
    RETURN_S,
    MAX_RETURN_S,
    flightPhase,
    flightDistance,
    easeReturn,
} from "./flight.ts";

/* Run with:
   node --experimental-strip-types --test components/SkillOrbit/flight.test.ts

   These encode the promise the fling makes: throw a skill and it is back in
   orbit within a few seconds. The original had no timer — friction alone
   decided, and it took 16–25 seconds. */

test("a flung body is always home within four seconds", () => {
    assert.ok(
        MAX_RETURN_S <= 4,
        `worst case is ${MAX_RETURN_S}s — the whole point is that it is not 20`,
    );
    assert.equal(MAX_RETURN_S, FREE_MAX_S + RETURN_S);
});

test("free flight always ends, however fast the body is still moving", () => {
    // The old bug: this was decided by speed, so a hard enough flick never
    // satisfied it in any reasonable time.
    assert.equal(flightPhase(FREE_MAX_S, 0), "return");
    assert.equal(flightPhase(FREE_MAX_S + 10, 0), "return");
    assert.equal(flightPhase(FREE_MAX_S - 0.01, 0), "free");
});

test("a body off the panel heads back sooner than one still visible", () => {
    assert.ok(
        OFFSCREEN_GRACE_S < FREE_MAX_S,
        "leaving the field must shorten the trip, not lengthen it",
    );
    assert.equal(flightPhase(0.1, OFFSCREEN_GRACE_S), "return");
    assert.equal(flightPhase(0.1, OFFSCREEN_GRACE_S - 0.01), "free");
    // Invisible for at most this long.
    assert.ok(OFFSCREEN_GRACE_S + RETURN_S <= 2.5);
});

test("either limit alone is enough to bring it home", () => {
    assert.equal(flightPhase(FREE_MAX_S, 0), "return"); // never left the panel
    assert.equal(flightPhase(0, OFFSCREEN_GRACE_S), "return"); // left immediately
});

test("flight distance is a fraction of launch speed, not a multiple", () => {
    /* THE regression guard. Distance is `v / −ln(DRAG_DECAY)`, and at the old
       0.86 that came to 6.6× the launch speed in pixels — a 1500 px/s flick
       travelled ~9,900px out of a 932px panel. Anything above 1× means a
       normal flick leaves the panel's own width behind. */
    const multiplier = flightDistance(MAX_FLING) / MAX_FLING;
    assert.ok(
        multiplier < 0.6,
        `flight covers ${multiplier.toFixed(2)}× the launch speed in px`,
    );
    assert.ok(flightDistance(MAX_FLING) < 700, "should stay near the panel");
});

test("flight distance is capped even for an absurd launch speed", () => {
    // `moveDrag` derives velocity from a pointer delta with no ceiling of its
    // own, so the clamp has to live here.
    assert.equal(flightDistance(99999), flightDistance(MAX_FLING));
    assert.ok(flightDistance(50) < flightDistance(MAX_FLING));
});

test("friction actually slows the body down", () => {
    assert.ok(DRAG_DECAY > 0 && DRAG_DECAY < 1);
    // Speed after one second of free flight.
    assert.ok(MAX_FLING * DRAG_DECAY < 200, "should be nearly stopped by 1s");
});

test("the return ease is clamped and decelerating", () => {
    assert.equal(easeReturn(0), 0);
    assert.equal(easeReturn(1), 1);
    assert.equal(easeReturn(-5), 0);
    assert.equal(easeReturn(5), 1);
    // Monotonic.
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
        const v = easeReturn(i / 20);
        assert.ok(v >= prev, "ease must not go backwards");
        prev = v;
    }
    // Decelerating: more than half the distance is covered in the first half.
    assert.ok(easeReturn(0.5) > 0.5);
});
