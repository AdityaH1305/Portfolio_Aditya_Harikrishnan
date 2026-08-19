/* ══════════════════════════════════════════════════════
   The scroll lock

   One case here is a real bug that shipped: a lock taken
   before Lenis existed was silently discarded, so the
   entrance never actually stopped the page. It looked
   locked — the scrollbar was gone and the wheel did nothing
   — but Lenis kept scrolling the window programmatically
   from the gsap ticker, and no overflow rule prevents that.

   It is an ordering race with one guaranteed loser:
   ScrollProvider registers from inside the ticker, which
   first runs on the next animation frame, and mount effects
   run before that frame. The gate ALWAYS locked first.
   ══════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";

import { lockScroll, registerLenis, unlockScroll } from "./lenis.ts";

/** Enough of Lenis to count calls. The module only ever uses these two. */
function fake() {
    const calls: string[] = [];
    return {
        calls,
        lenis: {
            stop: () => void calls.push("stop"),
            start: () => void calls.push("start"),
        },
    };
}

/** The module is a process-wide singleton; every case starts from nothing. */
function reset() {
    registerLenis(null);
}

test("A LOCK TAKEN BEFORE LENIS EXISTS IS STILL A LOCK", () => {
    /* The bug. `registerLenis` used to set `lockCount = 0`, so the entrance —
       which mounts with the page and locks immediately, long before the first
       animation frame — had its lock thrown away by the very call that made
       locking possible. */
    reset();
    lockScroll();

    const f = fake();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerLenis(f.lenis as any);

    assert.deepEqual(f.calls, ["stop"], "registering must honour a pending lock");
    reset();
});

test("registering with nothing pending does not stop the page", () => {
    reset();
    const f = fake();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerLenis(f.lenis as any);
    assert.deepEqual(f.calls, []);
    reset();
});

test("the count is what releases, not the last caller", () => {
    /* Reference counting is required rather than defensive: the command
       palette closes (unlock) while the game modal opens (lock) in overlapping
       effects, and a naive stop/start pair leaves the page either permanently
       locked or scrollable behind a modal depending on which ran last. */
    reset();
    const f = fake();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerLenis(f.lenis as any);

    lockScroll();
    lockScroll();
    assert.deepEqual(f.calls, ["stop"], "only the first lock stops");

    unlockScroll();
    assert.deepEqual(f.calls, ["stop"], "still held by the second lock");

    unlockScroll();
    assert.deepEqual(f.calls, ["stop", "start"], "the last release starts");
    reset();
});

test("over-unlocking cannot drive the count negative", () => {
    /* A negative count would swallow the next real lock entirely. */
    reset();
    const f = fake();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerLenis(f.lenis as any);

    unlockScroll();
    unlockScroll();
    lockScroll();
    assert.deepEqual(f.calls, ["start", "start", "stop"]);
    reset();
});

test("unregistering clears the count with the instance it belonged to", () => {
    reset();
    lockScroll();
    registerLenis(null);

    const f = fake();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerLenis(f.lenis as any);
    assert.deepEqual(f.calls, [], "a lock does not survive the instance");
    reset();
});
