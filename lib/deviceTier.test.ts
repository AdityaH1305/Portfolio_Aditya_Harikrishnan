import test from "node:test";
import assert from "node:assert/strict";

import {
    dprCap,
    startPerfLevel,
    tierFor,
    type DeviceSignals,
    type DeviceTier,
} from "./deviceTier.ts";

/* Run with:
   node --experimental-strip-types --test lib/deviceTier.test.ts

   The rule decides how much every canvas on the site draws, and it is made of
   browser signals that are missing, quantised or lying in ordinary cases. All
   of those cases are reachable here and none is reachable by looking at the
   page, which is the whole reason the decision was split out of the shell. */

/** A capable desktop. Each test overrides only what it is about. */
const DESKTOP: DeviceSignals = {
    saveData: false,
    cores: 8,
    memory: 8,
    coarse: false,
    dpr: 1,
};

const tier = (over: Partial<DeviceSignals>): DeviceTier =>
    tierFor({ ...DESKTOP, ...over });

test("a plain capable desktop is high", () => {
    assert.equal(tier({}), "high");
    assert.equal(tier({ cores: 16, memory: 32 }), "high");
    assert.equal(tier({ dpr: 2 }), "high", "a retina laptop is still a laptop");
});

test("DATA SAVER OUTRANKS EVERYTHING", () => {
    /* A stated preference beats every inference. The strongest possible
       hardware must not talk the rule out of honouring it. */
    assert.equal(
        tier({ saveData: true, cores: 32, memory: 64, dpr: 1 }),
        "low",
    );
});

test("UNDISCLOSED IS NOT ZERO", () => {
    /* Safari reports neither `hardwareConcurrency` nor `deviceMemory`. Read
       naively that is a machine with no cores and no memory, and every Safari
       visitor — on the site's best hardware — is demoted to the lowest tier.
       This is the single most likely way for this file to go wrong. */
    assert.equal(tier({ cores: 0, memory: 0 }), "high");
    assert.equal(tier({ cores: 0, memory: 0, coarse: false }), "high");

    // One disclosed and healthy, the other silent, is still not evidence.
    assert.equal(tier({ cores: 12, memory: 0 }), "high");
});

test("a genuinely small machine is low, on either signal alone", () => {
    assert.equal(tier({ cores: 4 }), "low");
    assert.equal(tier({ cores: 2 }), "low");
    assert.equal(tier({ memory: 4 }), "low");
    assert.equal(tier({ memory: 2 }), "low");
    // Either one is sufficient; neither needs the other to agree.
    assert.equal(tier({ cores: 4, memory: 32 }), "low");
    assert.equal(tier({ cores: 32, memory: 2 }), "low");
});

test("a touch screen is at most mid, and a dense one is low", () => {
    /* Every canvas on the site is full-viewport, so the backing store is the
       dominant cost and it scales with the SQUARE of the ratio. */
    assert.equal(tier({ coarse: true, dpr: 3 }), "low");
    assert.equal(tier({ coarse: true, dpr: 2.5 }), "low");
    assert.equal(tier({ coarse: true, dpr: 2 }), "mid");
    assert.equal(tier({ coarse: true, dpr: 1 }), "mid");

    // A powerful tablet is still a tablet — it never reaches "high".
    assert.equal(tier({ coarse: true, cores: 16, memory: 16, dpr: 2 }), "mid");
});

test("a middling desktop lands in the middle", () => {
    assert.equal(tier({ cores: 6, memory: 8 }), "mid");
    assert.equal(tier({ cores: 8, memory: 6 }), "mid");
});

test("every combination resolves to a real tier and never throws", () => {
    /* The signals arrive from a browser and the rule has no default branch to
       fall through to. A combination that returned undefined would surface as
       a canvas silently drawing nothing. */
    const valid = new Set(["low", "mid", "high"]);
    for (const saveData of [true, false]) {
        for (const cores of [0, 1, 2, 4, 6, 8, 16, 64]) {
            for (const memory of [0, 0.5, 2, 4, 8, 16]) {
                for (const coarse of [true, false]) {
                    for (const dpr of [0, 1, 1.5, 2, 2.5, 3, 4]) {
                        const t = tierFor({
                            saveData,
                            cores,
                            memory,
                            coarse,
                            dpr,
                        });
                        assert.ok(
                            valid.has(t),
                            `${saveData} ${cores} ${memory} ${coarse} ${dpr} -> ${t}`,
                        );
                    }
                }
            }
        }
    }
});

test("THE CAPS ONLY EVER GO DOWN", () => {
    /* A tier that raised a ceiling would be a device tier that made a weak
       machine work harder, which is the opposite of the point. */
    assert.ok(dprCap("low") < dprCap("mid"));
    assert.ok(dprCap("mid") < dprCap("high"));
    assert.ok(startPerfLevel("low") >= startPerfLevel("mid"));
    assert.ok(startPerfLevel("mid") >= startPerfLevel("high"));

    /* `high` must not be a REGRESSION for anyone: 2 is what GlyphA and the
       entrance already capped at, and 1.5 is what the atlas and the orbit
       chose. Nothing on a capable device may get softer than it was. */
    assert.equal(dprCap("high"), 2);
    assert.ok(dprCap("mid") >= 1.5);
    assert.equal(startPerfLevel("high"), 0);
});
