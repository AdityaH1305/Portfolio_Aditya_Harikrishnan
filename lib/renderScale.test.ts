import { test } from "node:test";
import assert from "node:assert/strict";
import {
    scaleFor,
    projectBurst,
    FrameEstimate,
    MIN_SAMPLES,
    renderScale,
    setRenderScale,
    resetRenderScale,
} from "./renderScale.ts";

test("a machine that will make its budget keeps every pixel", () => {
    // scaleFor takes the PROJECTED BURST cost, not the idle draw.
    assert.equal(scaleFor(16, 60), 1);
    assert.equal(scaleFor(8, 60), 1);
});

test("the projection is what separates a fast idle from a fast burst", () => {
    // 5ms of idle draw looks harmless and projects to a burst that is not.
    assert.ok(projectBurst(5) > 16.7);
    assert.ok(scaleFor(projectBurst(5), 60) < 1);
    // 2ms of idle draw has the headroom for four times the work.
    assert.equal(scaleFor(projectBurst(2), 60), 1);
});

test("quality is never reduced on too few samples", () => {
    // The first frames after mount are the slowest and the least
    // representative — layout, font swap, the dynamic chunk landing.
    assert.equal(scaleFor(40, MIN_SAMPLES - 1), 1);
    assert.equal(scaleFor(40, MIN_SAMPLES), 0.5);
});

test("the worse the frame time, the lower the scale", () => {
    const a = scaleFor(18, 60);
    const b = scaleFor(24, 60);
    const c = scaleFor(34, 60);
    assert.ok(a > b && b > c, `expected 18ms>${a} 24ms>${b} 34ms>${c} to descend`);
    assert.ok(c >= 0.5, "never below half — this is a quality floor, not a slider");
});

test("the scale is monotonic in frame time", () => {
    let prev = 1;
    for (let ms = 5; ms <= 60; ms += 0.5) {
        const s = scaleFor(ms, 60);
        assert.ok(s <= prev, `scale rose from ${prev} to ${s} at ${ms}ms`);
        prev = s;
    }
});

test("a nonsense frame time is treated as unknown, not as slow", () => {
    for (const bad of [0, -1, NaN]) {
        assert.equal(scaleFor(bad, 60), 1, `${bad} must not degrade quality`);
    }
});

test("the estimate is a median, so one stall cannot decide it", () => {
    const e = new FrameEstimate();
    for (let i = 0; i < 40; i++) e.add(2);
    e.add(180); // a long GC, still under the ceiling
    assert.equal(e.median(), 2);
    assert.equal(e.scale(), 1, "a healthy machine stays at full quality");
});

test("frames past the ceiling are discarded outright", () => {
    const e = new FrameEstimate();
    for (let i = 0; i < 30; i++) e.add(9);
    const before = e.count;
    e.add(1000); // a backgrounded tab handing back the whole absence
    assert.equal(e.count, before, "the stall is not a sample");
});

test("a genuinely slow machine is detected", () => {
    const e = new FrameEstimate();
    for (let i = 0; i < 40; i++) e.add(9 + (i % 3));
    assert.ok(e.scale() < 1, "should reduce");
    assert.ok(e.scale() >= 0.5);
});

test("the window is bounded, so a long idle cannot grow it forever", () => {
    const e = new FrameEstimate();
    for (let i = 0; i < 5000; i++) e.add(10);
    assert.equal(e.count, FrameEstimate.WINDOW);
});

test("the published scale defaults to full and rejects nonsense", () => {
    resetRenderScale();
    assert.equal(renderScale(), 1);
    setRenderScale(0.65);
    assert.equal(renderScale(), 0.65);
    for (const bad of [0, -1, 2, NaN]) {
        setRenderScale(bad);
        assert.equal(renderScale(), 1, `${bad} must fall back to full quality`);
    }
    resetRenderScale();
});
