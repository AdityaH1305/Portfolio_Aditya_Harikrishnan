import test from "node:test";
import assert from "node:assert/strict";

import {
    shouldShowGate,
    msUntilNextGate,
    GATE_TTL_MS,
    GATE_KEY,
} from "./gate.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/gate.test.ts */

const NOW = 1_700_000_000_000;
const at = (msAgo: number) => String(NOW - msAgo);

test("the clearance lasts exactly one hour", () => {
    assert.equal(GATE_TTL_MS, 3_600_000);
});

test("a first-time visitor sees the gate", () => {
    assert.equal(shouldShowGate(NOW, null), true);
});

test("a visitor who just cleared it does not see it again", () => {
    assert.equal(shouldShowGate(NOW, at(0)), false);
    assert.equal(shouldShowGate(NOW, at(60_000)), false);
    assert.equal(shouldShowGate(NOW, at(GATE_TTL_MS - 1)), false);
});

test("the gate returns once the hour is up", () => {
    assert.equal(shouldShowGate(NOW, at(GATE_TTL_MS)), true);
    assert.equal(shouldShowGate(NOW, at(GATE_TTL_MS + 1)), true);
    assert.equal(shouldShowGate(NOW, at(24 * 60 * 60 * 1000)), true);
});

test("reloading inside the hour never re-gates", () => {
    // The specific complaint this rule exists to prevent.
    for (let m = 0; m < 60; m++) {
        assert.equal(
            shouldShowGate(NOW, at(m * 60_000)),
            false,
            `re-gated after ${m} minutes`,
        );
    }
});

/* ── Hostile stored values ────────────────────────────
   localStorage is user-writable and survives deploys. The gate renders above
   the page content, so a throw here would take the whole site down. */

test("a corrupt stored value shows the gate rather than throwing", () => {
    for (const junk of ["", "  ", "null", "undefined", "NaN", "abc", "{}", "[]"]) {
        assert.equal(shouldShowGate(NOW, junk), true, `junk: ${JSON.stringify(junk)}`);
    }
});

test("a stored time in the future shows the gate", () => {
    // Clock moved backwards: travel, DST, a corrected NTP sync. Otherwise the
    // clearance outlives its hour by however far the clock jumped.
    assert.equal(shouldShowGate(NOW, String(NOW + 5_000)), true);
    assert.equal(shouldShowGate(NOW, String(NOW + 10 * GATE_TTL_MS)), true);
});

test("absurd values do not lock anyone out", () => {
    // Every one of these must SHOW the gate. The failure mode worth guarding
    // is a value that silently suppresses it forever, not one that shows it.
    assert.equal(shouldShowGate(NOW, "-1"), true); // 1970, long past the hour
    assert.equal(shouldShowGate(NOW, "0"), true); // epoch, same
    assert.equal(shouldShowGate(NOW, String(Number.MAX_SAFE_INTEGER)), true); // far future
    assert.equal(shouldShowGate(NOW, "Infinity"), true); // not finite
    assert.equal(shouldShowGate(NOW, "-Infinity"), true);
});

test("the countdown agrees with the decision", () => {
    assert.equal(msUntilNextGate(NOW, null), 0);
    assert.equal(msUntilNextGate(NOW, at(GATE_TTL_MS)), 0);
    assert.equal(msUntilNextGate(NOW, at(0)), GATE_TTL_MS);
    assert.equal(msUntilNextGate(NOW, at(GATE_TTL_MS / 2)), GATE_TTL_MS / 2);

    // Never negative, never longer than the TTL itself.
    for (const ago of [0, 1, 1000, GATE_TTL_MS - 1, GATE_TTL_MS, GATE_TTL_MS * 3]) {
        const left = msUntilNextGate(NOW, at(ago));
        assert.ok(left >= 0 && left <= GATE_TTL_MS, `out of range at ${ago}`);
    }
});

test("the storage key is namespaced", () => {
    assert.ok(GATE_KEY.includes(":"), "should not collide with a bare key");
});
