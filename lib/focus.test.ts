import { test } from "node:test";
import assert from "node:assert/strict";

import {
    nextFocusIndex,
    canRestoreFocus,
    FOCUSABLE_SELECTOR,
} from "./focus.ts";

/* ── The three ways a trap fails, all invisible until someone Tabs ─────── */

test("Tab wraps off the end back to the start", () => {
    assert.equal(nextFocusIndex(3, 2, 1), 0);
    assert.equal(nextFocusIndex(1, 0, 1), 0);
});

test("Shift+Tab wraps off the start back to the end", () => {
    assert.equal(nextFocusIndex(3, 0, -1), 2);
    assert.equal(nextFocusIndex(1, 0, -1), 0);
});

test("an empty container returns -1, never 0", () => {
    /* 0 would be a valid-looking index into an empty list, and the lookup
       would throw inside a keydown handler — i.e. it would break Tab for the
       whole page, not just the modal. */
    assert.equal(nextFocusIndex(0, -1, 1), -1);
    assert.equal(nextFocusIndex(0, 0, -1), -1);
    assert.equal(nextFocusIndex(-1, 0, 1), -1);
});

test("focus outside the container enters from the travelling direction", () => {
    /* Tab enters at the top, Shift+Tab at the bottom — otherwise the first
       Tab after opening a dialog jumps to its last control. */
    assert.equal(nextFocusIndex(4, -1, 1), 0);
    assert.equal(nextFocusIndex(4, -1, -1), 3);
});

test("an out-of-range index is treated as outside, not clamped", () => {
    assert.equal(nextFocusIndex(3, 99, 1), 0);
    assert.equal(nextFocusIndex(3, 3, -1), 2);
});

test("stepping forward then back returns to where it started", () => {
    for (const count of [1, 2, 5, 9]) {
        for (let i = 0; i < count; i++) {
            const fwd = nextFocusIndex(count, i, 1);
            assert.equal(nextFocusIndex(count, fwd, -1), i, `${count}@${i}`);
        }
    }
});

test("every index is reachable by tabbing round exactly once", () => {
    const count = 6;
    const seen = new Set<number>();
    let at = 0;
    for (let n = 0; n < count; n++) {
        seen.add(at);
        at = nextFocusIndex(count, at, 1);
    }
    assert.equal(seen.size, count);
    assert.equal(at, 0, "a full cycle returns to the start");
});

/* ── Restore ───────────────────────────────────────────────────────────── */

test("canRestoreFocus rejects null and detached nodes", () => {
    assert.equal(canRestoreFocus(null), false);

    /* The real case: CaseStudyStage swaps slides under the scrub, so the
       button that opened a Lightbox can be gone by the time it closes.
       Focusing a detached node silently does nothing and leaves focus on
       <body> — the reader is dumped to the top of the tab order. */
    const detached = {
        isConnected: false,
        focus() {},
    } as unknown as Element;
    assert.equal(canRestoreFocus(detached), false);
});

test("canRestoreFocus accepts a connected, focusable element", () => {
    const live = { isConnected: true, focus() {} } as unknown as Element;
    assert.equal(canRestoreFocus(live), true);
});

test("canRestoreFocus rejects a connected node with no focus method", () => {
    const odd = { isConnected: true } as unknown as Element;
    assert.equal(canRestoreFocus(odd), false);
});

/* ── The selector ──────────────────────────────────────────────────────── */

test("the focusable selector excludes tabindex=-1", () => {
    /* The skip link's targets are `tabindex="-1"` <main> elements. Including
       them would put a Tab stop on a landmark. */
    assert.ok(FOCUSABLE_SELECTOR.includes('[tabindex]:not([tabindex="-1"])'));
    assert.equal(FOCUSABLE_SELECTOR.includes('[tabindex="-1"],'), false);
});

test("the focusable selector skips disabled controls", () => {
    for (const tag of ["button", "input", "select", "textarea"]) {
        assert.ok(
            FOCUSABLE_SELECTOR.includes(`${tag}:not([disabled])`),
            tag,
        );
    }
});
