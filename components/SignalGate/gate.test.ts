import test from "node:test";
import assert from "node:assert/strict";

import {
    shouldShowGate,
    msRemaining,
    randomTtl,
    encodeClearance,
    parseClearance,
    bootSequence,
    TTL_MIN_MS,
    TTL_MAX_MS,
    GATE_KEY,
    BOOT_TOTAL_MS,
    BOOT_FADE_MS,
    BOOT_EMIT_MS,
    BOOT_FADE_AT,
} from "./gate.ts";
import { SECTION_IDS } from "../LivingArchitecture/stages.ts";
import { SKILLS } from "../SkillOrbit/data.ts";
import { CASE_STUDIES } from "../../lib/caseStudies.ts";

/* Run with:
   node --experimental-strip-types --test components/SignalGate/gate.test.ts */

const NOW = 1_700_000_000_000;

/** A clearance granted `msAgo` ago, lasting `ttl`. */
const at = (msAgo: number, ttl = TTL_MIN_MS) =>
    encodeClearance(NOW - msAgo, ttl);

/* ── The roll ─────────────────────────────────────────
   The length is now drawn per visit, so the bounds are the thing to assert;
   `rand` is injected precisely so this can be done without stubbing
   Math.random. */

test("a rolled clearance is always 30-60 seconds", () => {
    assert.equal(TTL_MIN_MS, 30_000);
    assert.equal(TTL_MAX_MS, 60_000);

    for (let i = 0; i <= 1000; i++) {
        const ttl = randomTtl(i / 1000);
        assert.ok(
            ttl >= TTL_MIN_MS && ttl <= TTL_MAX_MS,
            `rand ${i / 1000} gave ${ttl}`,
        );
    }

    // Both ends are actually reachable — a roll that never hits its bounds is
    // a narrower range than the one being claimed.
    assert.equal(randomTtl(0), TTL_MIN_MS);
    assert.equal(randomTtl(1), TTL_MAX_MS);
});

test("a broken caller cannot produce a clearance that never expires", () => {
    // NaN stored as a TTL would compare false against everything and suppress
    // the gate permanently. Every one of these must land back in range.
    for (const r of [NaN, Infinity, -Infinity, -5, 7]) {
        const ttl = randomTtl(r);
        assert.ok(
            ttl >= TTL_MIN_MS && ttl <= TTL_MAX_MS,
            `rand ${r} gave ${ttl}`,
        );
    }
});

/* ── The stored form ──────────────────────────────────
   Both the timestamp and that visit's TTL, because with a rolled length the
   remaining time is not derivable from the timestamp alone. */

test("encode and parse round-trip", () => {
    for (const ttl of [TTL_MIN_MS, 45_000, TTL_MAX_MS]) {
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
    assert.equal(shouldShowGate(NOW, at(TTL_MIN_MS - 1)), false);
});

test("the gate returns once THAT VISIT'S clearance is up, not a constant", () => {
    // The reason the TTL is stored: a 30s and a 60s clearance of the same age
    // must disagree.
    assert.equal(shouldShowGate(NOW, at(45_000, 30_000)), true);
    assert.equal(shouldShowGate(NOW, at(45_000, 60_000)), false);

    assert.equal(shouldShowGate(NOW, at(TTL_MIN_MS, TTL_MIN_MS)), true);
    assert.equal(shouldShowGate(NOW, at(TTL_MAX_MS, TTL_MAX_MS)), true);
    assert.equal(shouldShowGate(NOW, at(24 * 60 * 60 * 1000)), true);
});

test("reloading inside the clearance never re-gates", () => {
    // The specific complaint this rule exists to prevent, swept a second at a
    // time across both ends of the range.
    for (const ttl of [TTL_MIN_MS, 45_000, TTL_MAX_MS]) {
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
        `:${TTL_MIN_MS}`,
        `${NOW}:${TTL_MIN_MS}:extra`,
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
    assert.equal(shouldShowGate(NOW, encodeClearance(NOW + 5_000, TTL_MIN_MS)), true);
    assert.equal(
        shouldShowGate(NOW, encodeClearance(NOW + 10 * TTL_MAX_MS, TTL_MAX_MS)),
        true,
    );
});

test("a hand-edited TTL cannot hide the gate forever", () => {
    /* The failure mode worth guarding is a value that silently suppresses the
       gate, not one that shows it. An over-long TTL is clamped to the maximum,
       so a clearance written by hand still expires on schedule. */
    const forever = encodeClearance(NOW - TTL_MAX_MS, 1e12);
    assert.equal(parseClearance(forever)?.ttl, TTL_MAX_MS);
    assert.equal(shouldShowGate(NOW, forever), true);

    assert.equal(shouldShowGate(NOW, at(0, Number.MAX_SAFE_INTEGER)), false);
    assert.equal(shouldShowGate(NOW, at(TTL_MAX_MS, Number.MAX_SAFE_INTEGER)), true);
});

test("absurd timestamps do not lock anyone out", () => {
    assert.equal(shouldShowGate(NOW, at(NOW)), true); // epoch, long past
    assert.equal(shouldShowGate(NOW, encodeClearance(-1, TTL_MIN_MS)), true);
    assert.equal(
        shouldShowGate(NOW, encodeClearance(Number.MAX_SAFE_INTEGER, TTL_MIN_MS)),
        true,
    );
});

/* ── The countdown ────────────────────────────────────
   UplinkTimer renders this number while the gate reads the boolean above. If
   they ever disagree the visible timer sits at zero with no gate, or counts
   down past a gate that already returned. */

test("the countdown agrees with the decision", () => {
    assert.equal(msRemaining(NOW, null), 0);
    assert.equal(msRemaining(NOW, at(TTL_MIN_MS)), 0);
    assert.equal(msRemaining(NOW, at(0)), TTL_MIN_MS);
    assert.equal(msRemaining(NOW, at(10_000, 45_000)), 35_000);

    for (const ttl of [TTL_MIN_MS, 45_000, TTL_MAX_MS]) {
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

/* ── The boot sequence ─────────────────────────────── */

test("click to portfolio is exactly two seconds", () => {
    // The number was specified, so it is asserted rather than trusted.
    assert.equal(BOOT_TOTAL_MS, 2000);
    // The fade OVERLAPS the tail. If it were added on top the entrance would
    // silently become 2.42s, which is the mistake this guards.
    assert.equal(BOOT_EMIT_MS + BOOT_FADE_MS, BOOT_TOTAL_MS);
    assert.equal(BOOT_FADE_AT, BOOT_EMIT_MS);
});

test("lines are ordered, start at zero and end as the fade begins", () => {
    const lines = bootSequence();
    assert.ok(lines.length >= 5, "too short to read as a boot");
    assert.equal(lines[0].at, 0, "first line should be immediate");
    assert.equal(
        lines[lines.length - 1].at,
        BOOT_FADE_AT,
        "last line should land exactly as the fade starts",
    );
    for (let i = 1; i < lines.length; i++) {
        assert.ok(
            lines[i].at > lines[i - 1].at,
            `line ${i} does not advance (${lines[i - 1].at} -> ${lines[i].at})`,
        );
        assert.ok(lines[i].at <= BOOT_TOTAL_MS, "line lands after the gate is gone");
    }
});

test("no line is left unreadably brief", () => {
    const lines = bootSequence();
    for (let i = 1; i < lines.length; i++) {
        assert.ok(
            lines[i].at - lines[i - 1].at >= 90,
            `gap ${lines[i].at - lines[i - 1].at}ms reads as a flicker`,
        );
    }
});

test("THE LOG CANNOT LIE — counts come from the live data", () => {
    /* The whole reason the sequence reads from the real arrays. This fails
       the day someone adds a skill, adds a section or ships a fourth case
       study and forgets the entrance exists, which is exactly the kind of
       thing that otherwise ships as a confident wrong number. */
    const text = bootSequence()
        .map((l) => l.label)
        .join(" | ");

    assert.ok(
        text.includes(`${SECTION_IDS.length} stages`),
        `expected ${SECTION_IDS.length} stages in: ${text}`,
    );
    assert.ok(
        text.includes(`${SKILLS.length} bodies`),
        `expected ${SKILLS.length} bodies in: ${text}`,
    );
    assert.ok(
        text.includes(`projects / ${CASE_STUDIES.length}`),
        `expected ${CASE_STUDIES.length} projects in: ${text}`,
    );

    // And no hardcoded number may survive anywhere in the log.
    for (const n of text.match(/\d+/g) ?? []) {
        assert.ok(
            [SECTION_IDS.length, SKILLS.length, CASE_STUDIES.length]
                .map(String)
                .includes(n),
            `"${n}" in the boot log matches no live count`,
        );
    }
});

test("the log opens and closes on a statement, not a check", () => {
    const lines = bootSequence();
    assert.equal(lines[0].status, undefined);
    assert.equal(lines[lines.length - 1].status, undefined);
    // Everything between reports a result.
    for (const l of lines.slice(1, -1)) assert.equal(l.status, "OK");
});

test("the sequence is pure", () => {
    assert.deepEqual(bootSequence(), bootSequence());
});
