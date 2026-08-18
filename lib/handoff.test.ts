/* The handoff's one rule: published once, collected once. */

import { test } from "node:test";
import assert from "node:assert/strict";

import { publishBurst, takeBurst } from "./handoff.ts";
import { shatter } from "../components/SignalGate/finale.ts";

test("an ungated load collects nothing", () => {
    /* `/work/*` and any visit inside an unexpired clearance never render a
       gate, so there is no burst — and the letter has to assemble anyway,
       from a scatter it cuts itself. `null` is the normal case, not a fault. */
    assert.equal(takeBurst(), null);
});

test("the fragments arrive exactly as they were cut", () => {
    const frags = shatter(Math.random);
    publishBurst(frags, 1234);

    const got = takeBurst();
    assert.ok(got);
    assert.equal(got.at, 1234);
    assert.equal(got.fragments.length, frags.length);
    // Identity, not equality: the letter is built from the pieces the reader
    // watched leave, so a structurally-equal re-cut would not do.
    assert.equal(got.fragments[0], frags[0]);
});

test("COLLECTING CONSUMES, SO THE ARRIVAL CANNOT REPLAY", () => {
    /* The letter assembles once per page load. Leaving the value in place
       would have any remount — Fast Refresh in development, or React's
       StrictMode double-invoke, which fires on EVERY mount — fly the
       fragments in again at a letter that is already standing there. */
    publishBurst(shatter(Math.random), 7);
    assert.ok(takeBurst());
    assert.equal(takeBurst(), null);
    assert.equal(takeBurst(), null);
});
