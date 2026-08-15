import test from "node:test";
import assert from "node:assert/strict";

/* Run with:
   node --experimental-strip-types --test lib/entrance.test.ts

   The module holds process-wide state, and `releaseEntrance` is one-way by
   design — so each case that needs a fresh module gets one through a cache-
   busting query on the import specifier. That is the whole reason these are
   dynamic imports rather than a static one at the top. */

let seq = 0;
const fresh = () => import(`./entrance.ts?case=${seq++}`);

test("a subscriber waits, then runs exactly once on release", async () => {
    const { onEntranceReady, releaseEntrance, entranceHeld } = await fresh();

    let calls = 0;
    onEntranceReady(() => calls++);

    assert.equal(entranceHeld(), true, "should hold before release");
    assert.equal(calls, 0, "nothing may run while held");

    releaseEntrance();
    assert.equal(entranceHeld(), false);
    assert.equal(calls, 1);
});

test("RELEASE IS IDEMPOTENT — the second call is a no-op", async () => {
    /* Three call sites can fire on one load: the gate, the route template and
       the failsafe. Replaying the callbacks would restart every entrance
       mid-flight, which reads as a stutter and is very hard to trace back to
       a double release. */
    const { onEntranceReady, releaseEntrance } = await fresh();

    let calls = 0;
    onEntranceReady(() => calls++);

    releaseEntrance();
    releaseEntrance();
    releaseEntrance();

    assert.equal(calls, 1, `ran ${calls} times`);
});

test("subscribing after release runs synchronously", async () => {
    // A component mounted by a later client-side navigation must behave the
    // same as one that was waiting all along.
    const { onEntranceReady, releaseEntrance } = await fresh();
    releaseEntrance();

    let ran = false;
    onEntranceReady(() => {
        ran = true;
    });

    assert.equal(ran, true, "should not wait for a release that already came");
});

test("unsubscribing stops a callback firing", async () => {
    /* What stops a Reveal unmounted while waiting from being revived into a
       dead scope — which under StrictMode's double-invoke is every mount. */
    const { onEntranceReady, releaseEntrance } = await fresh();

    let calls = 0;
    const off = onEntranceReady(() => calls++);
    off();
    releaseEntrance();

    assert.equal(calls, 0);
});

test("unsubscribing after release is safe", async () => {
    const { onEntranceReady, releaseEntrance } = await fresh();
    releaseEntrance();

    const off = onEntranceReady(() => {});
    assert.doesNotThrow(off);
    assert.doesNotThrow(off, "twice, too");
});

test("every subscriber runs even if one of them subscribes again", async () => {
    /* The set is drained before the callbacks run, so a callback that calls
       onEntranceReady cannot grow the collection being iterated. Without
       that, this is either a skipped callback or an infinite loop depending
       on the runtime. */
    const { onEntranceReady, releaseEntrance } = await fresh();

    const order: string[] = [];
    onEntranceReady(() => {
        order.push("a");
        onEntranceReady(() => order.push("nested"));
    });
    onEntranceReady(() => order.push("b"));

    releaseEntrance();

    assert.deepEqual(order, ["a", "nested", "b"]);
});

test("a claim suppresses nothing on its own", async () => {
    /* `claimEntrance` only records intent — the route template reads it and
       stands down. It must never release or hold anything by itself, or the
       gate's own `close()` would have nothing left to do. */
    const { claimEntrance, entranceClaimed, entranceHeld, onEntranceReady } =
        await fresh();

    let calls = 0;
    onEntranceReady(() => calls++);

    assert.equal(entranceClaimed(), false);
    claimEntrance();

    assert.equal(entranceClaimed(), true);
    assert.equal(entranceHeld(), true, "claiming is not releasing");
    assert.equal(calls, 0);
});
