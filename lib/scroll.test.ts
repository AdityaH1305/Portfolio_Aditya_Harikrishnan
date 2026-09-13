import { test } from "node:test";
import assert from "node:assert/strict";

/* Explicit `.ts` — Node's ESM resolver needs the extension and `@/` does not
   resolve here. `allowImportingTsExtensions` covers it; CLAUDE.md says not to
   "fix" these. */
import {
    JUMP_DURATION,
    JUMP_EASING,
    SCROLL_DURATION,
    SCROLL_EASING,
} from "./scroll.ts";

/**
 * Peak per-step distance over mean per-step distance.
 *
 * The same measurement components/ZoneTitle/word.test.ts makes on `settle`,
 * and for the same reason: it is the ratio that decides whether travel reads
 * as motion or as a snap, and it is invisible in the constant itself.
 */
function peakOverMean(f: (t: number) => number, steps = 400): number {
    let prev = f(0);
    let peak = 0;
    let total = 0;
    for (let k = 1; k <= steps; k++) {
        const at = f(k / steps);
        const d = Math.abs(at - prev);
        if (d > peak) peak = d;
        total += d;
        prev = at;
    }
    return peak / (total / steps);
}

/* ── The assertion this whole change exists for ────────────────────────── */

test("NO PART OF A JUMP IS A BURST", () => {
    /* word.test.ts sets the bar at 1.6 and calls anything above it a snap.
       A section-to-section scroll is the same problem at a much larger
       distance, so it answers to the same number. */
    const ratio = peakOverMean(JUMP_EASING);
    assert.ok(
        ratio <= 1.6,
        `JUMP_EASING peaked at ${ratio.toFixed(2)}x its average — that is a snap`,
    );
});

test("the curve the wheel uses would FAIL that bar — they are not interchangeable", () => {
    /* This is the regression guard, and it is the point of the file.

       `SCROLL_EASING` and `JUMP_EASING` look like duplication begging to be
       unified, and unifying them in either direction reopens the bug: the
       wheel wants a fast departure and a long settle, a jump wants a bounded
       peak. Asserting the old curve is far over the bar is what makes that
       argument survive a tidy-up. */
    const wheel = peakOverMean(SCROLL_EASING);
    assert.ok(
        wheel > 4,
        `SCROLL_EASING measured ${wheel.toFixed(2)}x — expected the ease-out expo to be far over 1.6`,
    );
    assert.ok(wheel > peakOverMean(JUMP_EASING) * 3);
});

/* ── The invariant, in pixels ──────────────────────────────────────────── */

test("no single 60fps frame of any jump moves more than a hurried wheel flick", () => {
    /* The failure was never the total distance, it was one frame handing the
       case-study choreography a ~1,200px step. Peak frame distance is
       `px / (60 / peakRatio * duration)`; with smoothstep's 1.5 that is
       `px / (40 * duration)`.

       18,974px is the measured home-page document height (PERF_PLAN §7.5) and
       is a deliberate OVER-estimate of the longest jump: the last section
       starts well before the document ends, so nothing can actually travel
       this far. Bounding the impossible case is what makes the number safe.

       400px rather than a rounder figure because it is anchored to something
       real — a trackpad flick already drives this page at 200-400px/frame and
       it copes. The jump should ask no more of the scroll-linked systems than
       a hurried reader already does. It currently lands at 365px. */
    const DOC_HEIGHT = 18_974;
    const ratio = peakOverMean(JUMP_EASING);
    const worstFrame = (DOC_HEIGHT / JUMP_DURATION) * (ratio / 60);

    assert.ok(
        worstFrame <= 400,
        `worst frame is ${worstFrame.toFixed(0)}px — raise JUMP_DURATION or lower the peak`,
    );

    /* And the same flight on the old pairing, for the record: it is the number
       the report was about. */
    const before = (DOC_HEIGHT / SCROLL_DURATION) * (peakOverMean(SCROLL_EASING) / 60);
    assert.ok(before > 3 * worstFrame, "the fix should be a multiple, not a trim");
});

test("a jump never takes longer than the wheel's own settle", () => {
    /* "Smooth but not slow" was the brief. Every jump has to finish sooner
       than the 1.8s it replaced, or this traded one complaint for another. */
    assert.ok(
        JUMP_DURATION < SCROLL_DURATION,
        `JUMP_DURATION ${JUMP_DURATION}s is not shorter than SCROLL_DURATION ${SCROLL_DURATION}s`,
    );
    assert.ok(JUMP_DURATION > 0.6, "short enough to feel like a snap again");
});

/* ── The four guards word.test.ts puts on `settle` ─────────────────────── */

test("endpoints are exact", () => {
    /* Anything other than exactly 0 and 1 lands the reader short of, or past,
       the section they asked for. */
    assert.equal(JUMP_EASING(0), 0);
    assert.equal(JUMP_EASING(1), 1);
});

test("it clamps outside [0,1]", () => {
    assert.equal(JUMP_EASING(-3), 0);
    assert.equal(JUMP_EASING(-0.001), 0);
    assert.equal(JUMP_EASING(4), 1);
    assert.equal(JUMP_EASING(1.001), 1);
});

test("it is monotonic — a jump never travels backwards", () => {
    let prev = JUMP_EASING(0);
    for (let t = 0; t <= 1; t += 0.005) {
        const v = JUMP_EASING(t);
        assert.ok(v >= prev, `went backwards at t=${t.toFixed(3)}`);
        prev = v;
    }
});

test("it matches settle() in ZoneTitle/word.ts, which it is a copy of", () => {
    /* The duplication is deliberate — lib/ must not import from components/ —
       so this pins the two together. If word.ts's curve is ever retuned, this
       fails and the choice becomes explicit instead of silent. */
    const settle = (t: number) => {
        const c = t < 0 ? 0 : t > 1 ? 1 : t;
        return c * c * (3 - 2 * c);
    };
    for (let t = -0.2; t <= 1.2; t += 0.01) {
        assert.equal(JUMP_EASING(t), settle(t), `diverged at t=${t.toFixed(2)}`);
    }
});
