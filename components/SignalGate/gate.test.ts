import test from "node:test";
import assert from "node:assert/strict";

import {
    shouldShowGate,
    msRemaining,
    expiredClearance,
    encodeClearance,
    parseClearance,
    TTL_MS,
    GATE_KEY,
    EXIT_MS,
    CONVERGE_AT,
    CONVERGE_MS,
    MERGE_MS,
    BURST_AT,
    BURST_MS,
    FINALE_MS,
} from "./gate.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/gate.test.ts */

const NOW = 1_700_000_000_000;

/** A clearance granted `msAgo` ago, lasting `ttl`. */
const at = (msAgo: number, ttl = TTL_MS) => encodeClearance(NOW - msAgo, ttl);

/* ── The length ───────────────────────────────────────
   One minute, flat. It was an hour, then a 30–60s roll; the roll bought
   nothing anyone could perceive and made the rule harder to state. */

test("a clearance is one minute", () => {
    assert.equal(TTL_MS, 60_000);
});

/* ── The stored form ──────────────────────────────────
   Still the timestamp AND the TTL, even though the TTL is now derivable from
   the constant. That is what lets a value written by an earlier deploy — a 30s
   or 45s roll — be honoured as written rather than reinterpreted as a minute. */

test("encode and parse round-trip", () => {
    for (const ttl of [15_000, 45_000, TTL_MS]) {
        const c = parseClearance(encodeClearance(NOW, ttl));
        assert.deepEqual(c, { at: NOW, ttl });
    }
});

test("the stored form stays parseable by a one-line script", () => {
    /* app/layout.tsx re-implements this parse pre-paint and cannot import the
       module. Two integers and one colon is the contract that keeps the two
       honest; anything richer would be the thing that silently drifts. */
    const raw = encodeClearance(NOW, 42_000);
    assert.match(raw, /^\d+:\d+$/);
    assert.equal(raw.split(":").length, 2);
});

test("the old timestamp-only format is not mistaken for a clearance", () => {
    // Shipped before the roll existed. It must read as "no clearance" — one
    // extra trip through the gate — rather than as a TTL of nothing.
    assert.equal(parseClearance(String(NOW)), null);
    assert.equal(shouldShowGate(NOW, String(NOW)), true);
});

/* ── The rule ─────────────────────────────────────── */

test("a first-time visitor sees the gate", () => {
    assert.equal(shouldShowGate(NOW, null), true);
});

test("a visitor who just cleared it does not see it again", () => {
    assert.equal(shouldShowGate(NOW, at(0)), false);
    assert.equal(shouldShowGate(NOW, at(10_000)), false);
    assert.equal(shouldShowGate(NOW, at(TTL_MS - 1)), false);
});

test("the gate returns once THAT VISIT'S clearance is up, not a constant", () => {
    // The reason the TTL is stored: a 30s and a 60s clearance of the same age
    // must disagree.
    assert.equal(shouldShowGate(NOW, at(45_000, 30_000)), true);
    assert.equal(shouldShowGate(NOW, at(45_000, 60_000)), false);

    assert.equal(shouldShowGate(NOW, at(TTL_MS, TTL_MS)), true);
    assert.equal(shouldShowGate(NOW, at(24 * 60 * 60 * 1000)), true);
});

/* ── Ending a clearance on purpose ────────────────────
   The countdown chip can now expire its own clearance, so someone who wants to
   see the entrance again does not have to wait a minute out. */

test("an ended clearance re-gates the next load and reads as expired", () => {
    const ended = expiredClearance();

    // Both halves, because the chip and the gate read different functions and
    // a disagreement between them is the bug this pair keeps having.
    assert.equal(shouldShowGate(NOW, ended), true);
    assert.equal(msRemaining(NOW, ended), 0);
});

test("AN ENDED CLEARANCE CANNOT BE REVIVED BY THE CLOCK", () => {
    /* `now - TTL_MS` was the obvious way to write this and it is wrong: it is
       expired at the current clock but comes back to life the moment the clock
       moves BACKWARDS by less than a minute — travel, DST, a corrected NTP
       sync. Dating it to the epoch holds for any clock at least a minute past
       1970, in either direction — which is every clock a browser can plausibly
       report. */
    const ended = expiredClearance();
    for (const clock of [
        TTL_MS, // the exact floor
        946_684_800_000, // a clock stuck in 2000
        NOW - 5 * TTL_MS,
        NOW - 1,
        NOW,
        NOW + 5 * TTL_MS,
    ]) {
        assert.equal(
            shouldShowGate(clock, ended),
            true,
            `revived at a clock of ${clock}`,
        );
    }
});

test("an ended clearance is still a clearance, not an absence of one", () => {
    /* The chip renders only when `parseClearance` returns something — it keys
       off that to decide whether any clearance exists at all. Deleting the key
       instead of backdating it would make the chip vanish from the corner at
       the exact moment the reader pressed it, with nothing left on screen to
       show what they had just done. */
    assert.notEqual(parseClearance(expiredClearance()), null);
    assert.match(expiredClearance(), /^\d+:\d+$/);
});

test("reloading inside the clearance never re-gates", () => {
    // The specific complaint this rule exists to prevent, swept a second at a
    // time across both ends of the range.
    for (const ttl of [15_000, 45_000, TTL_MS]) {
        for (let s = 0; s * 1000 < ttl; s++) {
            assert.equal(
                shouldShowGate(NOW, at(s * 1000, ttl)),
                false,
                `re-gated ${s}s into a ${ttl}ms clearance`,
            );
        }
    }
});

/* ── Hostile stored values ────────────────────────────
   localStorage is user-writable and survives deploys. The gate renders above
   the page content, so a throw here would take the whole site down. */

test("a corrupt stored value shows the gate rather than throwing", () => {
    for (const junk of [
        "",
        "  ",
        "null",
        "undefined",
        "NaN",
        "abc",
        "{}",
        "[]",
        ":",
        "abc:def",
        `${NOW}:`,
        `:${TTL_MS}`,
        `${NOW}:${TTL_MS}:extra`,
        `${NOW}:0`,
        `${NOW}:-30000`,
        `${NOW}:Infinity`,
    ]) {
        assert.equal(
            shouldShowGate(NOW, junk),
            true,
            `junk: ${JSON.stringify(junk)}`,
        );
        assert.equal(msRemaining(NOW, junk), 0, `junk: ${JSON.stringify(junk)}`);
    }
});

test("a stored time in the future shows the gate", () => {
    // Clock moved backwards: travel, DST, a corrected NTP sync. Otherwise the
    // clearance outlives its window by however far the clock jumped.
    assert.equal(shouldShowGate(NOW, encodeClearance(NOW + 5_000, TTL_MS)), true);
    assert.equal(
        shouldShowGate(NOW, encodeClearance(NOW + 10 * TTL_MS, TTL_MS)),
        true,
    );
});

test("a hand-edited TTL cannot hide the gate forever", () => {
    /* The failure mode worth guarding is a value that silently suppresses the
       gate, not one that shows it. An over-long TTL is clamped to the maximum,
       so a clearance written by hand still expires on schedule. */
    const forever = encodeClearance(NOW - TTL_MS, 1e12);
    assert.equal(parseClearance(forever)?.ttl, TTL_MS);
    assert.equal(shouldShowGate(NOW, forever), true);

    assert.equal(shouldShowGate(NOW, at(0, Number.MAX_SAFE_INTEGER)), false);
    assert.equal(shouldShowGate(NOW, at(TTL_MS, Number.MAX_SAFE_INTEGER)), true);
});

test("absurd timestamps do not lock anyone out", () => {
    assert.equal(shouldShowGate(NOW, at(NOW)), true); // epoch, long past
    assert.equal(shouldShowGate(NOW, encodeClearance(-1, TTL_MS)), true);
    assert.equal(
        shouldShowGate(NOW, encodeClearance(Number.MAX_SAFE_INTEGER, TTL_MS)),
        true,
    );
});

/* ── The countdown ────────────────────────────────────
   UplinkTimer renders this number while the gate reads the boolean above. If
   they ever disagree the visible timer sits at zero with no gate, or counts
   down past a gate that already returned. */

test("the countdown agrees with the decision", () => {
    assert.equal(msRemaining(NOW, null), 0);
    assert.equal(msRemaining(NOW, at(TTL_MS)), 0);
    assert.equal(msRemaining(NOW, at(0)), TTL_MS);
    assert.equal(msRemaining(NOW, at(10_000, 45_000)), 35_000);

    for (const ttl of [15_000, 45_000, TTL_MS]) {
        for (const ago of [0, 1, 1_000, ttl - 1, ttl, ttl + 1, ttl * 3]) {
            const left = msRemaining(NOW, at(ago, ttl));
            assert.ok(left >= 0 && left <= ttl, `${left} out of range at ${ago}`);
            assert.equal(
                left === 0,
                shouldShowGate(NOW, at(ago, ttl)),
                `countdown and gate disagree ${ago}ms into ${ttl}ms`,
            );
        }
    }
});

test("the storage key is namespaced", () => {
    assert.ok(GATE_KEY.includes(":"), "should not collide with a bare key");
});

/* ── The finale ───────────────────────────────────────
   The schedule that replaced the boot readout. Every offset is derived, and
   these tests exist because two consumers key off `FINALE_MS` — `close()` and
   the entrance failsafe — so a hardcoded millisecond anywhere downstream is
   the failure that would show up as the gate unmounting mid-explosion. */

test("every offset is derived, not written twice", () => {
    assert.equal(BURST_AT, CONVERGE_AT + CONVERGE_MS + MERGE_MS);
    assert.equal(FINALE_MS, BURST_AT + BURST_MS);
});

test("THE GATHER STARTS BEFORE THE COPY HAS FINISHED LEAVING", () => {
    /* The overlap is the design. Text out *then* cubes in reads as two steps;
       starting the gather while the last words are still going makes the whole
       press one gesture. If someone retimes the exit longer than the gather's
       start, that overlap silently becomes a gap. */
    assert.ok(
        CONVERGE_AT < EXIT_MS,
        `the gather begins at ${CONVERGE_AT}ms, after the copy is gone at ${EXIT_MS}ms`,
    );
    assert.ok(CONVERGE_AT > 0, "the gather must not start on the same frame as the press");
});

test("the beats are in order and none is instant", () => {
    const beats = { EXIT_MS, CONVERGE_MS, MERGE_MS, BURST_MS };
    for (const [name, ms] of Object.entries(beats)) {
        assert.ok(ms > 0, `${name} is ${ms}`);
    }
    assert.ok(CONVERGE_AT < BURST_AT, "the gather must precede the burst");
    assert.ok(BURST_AT < FINALE_MS, "the burst must precede the unmount");
});

test("the merged cube gets a beat of its own", () => {
    /* Without a hold the gather and the burst run together and the single cube
       — the whole point of the gather — is never actually seen. A quarter of a
       second is the floor for a shape registering as a shape. */
    assert.ok(MERGE_MS >= 250, `only ${MERGE_MS}ms on screen as one cube`);
});

test("the debris has time to clear before the gate unmounts", () => {
    // The gate goes at FINALE_MS. If the burst ran longer, fragments would be
    // cut off mid-flight — see the "everything is gone by the end" test in
    // finale.test.ts, which is the other half of this.
    assert.equal(FINALE_MS - BURST_AT, BURST_MS);
});

test("the whole thing stays under three seconds", () => {
    /* It is between a stranger and the site, and it plays before they have
       decided to care. The boot readout it replaced was 2900ms. */
    assert.ok(FINALE_MS <= 3000, `${FINALE_MS}ms from the press to the site`);
});
