import test from "node:test";
import assert from "node:assert/strict";

import {
    shouldShowGate,
    msUntilNextGate,
    bootSequence,
    GATE_TTL_MS,
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
        text.includes(`case studies / ${CASE_STUDIES.length}`),
        `expected ${CASE_STUDIES.length} case studies in: ${text}`,
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
