/* ══════════════════════════════════════════════════════
   Signal gate timing

   Pure, so the one rule that matters — "having cleared it,
   you are not asked again until your clearance expires" —
   is provable in node instead of by sitting and waiting.

   Everything here is defensive about the stored value on
   purpose. It comes from localStorage, which is user-
   writable, shared across tabs, survives deploys, and can
   hold anything at all. A gate that throws on a corrupt key
   would take the whole page down with it, since it renders
   above the content.
   ══════════════════════════════════════════════════════ */

export const GATE_KEY = "signal:cleared";

/* ── The clearance is short, and its length is rolled ──
   It used to be a flat hour. It is now 30–60 seconds, drawn once per
   clearance, and the visitor is shown the countdown — an uplink that visibly
   decays is a different object from a cookie banner that remembers you.

   THE TTL IS STORED ALONGSIDE THE TIMESTAMP, and that is not incidental. With
   a constant, "how long is left" is derivable from the timestamp alone; with a
   roll, it is not. Storing only the timestamp would leave the countdown and
   the gate decision each guessing a different number, and they would disagree
   by up to 30 seconds — the visible timer would hit zero while the gate stayed
   away, or the reverse. */
export const TTL_MIN_MS = 30_000;
export const TTL_MAX_MS = 60_000;

/**
 * Roll a clearance length.
 *
 * `rand` is injected rather than read from `Math.random` so the bounds are
 * assertable. Anything outside 0…1 — including NaN from a broken caller — is
 * clamped rather than propagated, because a NaN TTL stored here becomes a
 * value that never expires.
 */
export function randomTtl(rand: number): number {
    const r = Number.isFinite(rand) ? Math.min(1, Math.max(0, rand)) : 0;
    return Math.round(TTL_MIN_MS + r * (TTL_MAX_MS - TTL_MIN_MS));
}

export interface Clearance {
    /** When it was granted, in epoch ms. */
    at: number;
    /** How long it lasts, in ms. Rolled at grant time. */
    ttl: number;
}

/**
 * The stored form: `"<at>:<ttl>"`.
 *
 * Deliberately trivial to parse — the pre-paint script in `app/layout.tsx` has
 * to read the same string in a single expression, before React exists, and it
 * cannot import this module. Two integers and a colon is the most that can be
 * kept honestly in sync between the two.
 */
export function encodeClearance(at: number, ttl: number): string {
    return `${Math.round(at)}:${Math.round(ttl)}`;
}

/**
 * Read the stored form, or `null` for anything that is not one.
 *
 * `null` means "show the gate". That covers a first visit, a corrupt value, a
 * hand-edited one, and the old timestamp-only format from before the roll —
 * all of which cost at most one unexpected trip through the entrance, against
 * the alternative of being locked out of it permanently.
 *
 * A stored TTL is clamped to `TTL_MAX_MS`. Rejecting an over-long one outright
 * would work too, but clamping also covers the case worth actually worrying
 * about: someone writing `"…:1e12"` by hand and never seeing the gate again.
 */
export function parseClearance(raw: string | null): Clearance | null {
    if (raw === null) return null;

    const parts = raw.split(":");
    if (parts.length !== 2) return null;

    const at = Number(parts[0]);
    const ttl = Number(parts[1]);
    if (!Number.isFinite(at) || !Number.isFinite(ttl)) return null;
    if (ttl <= 0) return null;

    return { at, ttl: Math.min(ttl, TTL_MAX_MS) };
}

/**
 * Should the gate be shown?
 *
 * A stored time in the FUTURE shows it. That happens when the system clock
 * moves backwards — travel, DST, a corrected NTP sync — and the alternative is
 * a clearance that outlives its window by however far the clock jumped.
 */
export function shouldShowGate(now: number, stored: string | null): boolean {
    const c = parseClearance(stored);
    if (c === null) return true;

    const elapsed = now - c.at;
    if (elapsed < 0) return true;

    return elapsed >= c.ttl;
}

/**
 * Milliseconds left on the clearance. 0 once it has run out.
 *
 * This is what the on-screen countdown reads, so it must never disagree with
 * `shouldShowGate` — hence the shared parse and the explicit zero.
 */
export function msRemaining(now: number, stored: string | null): number {
    const c = parseClearance(stored);
    if (c === null) return 0;

    const elapsed = now - c.at;
    if (elapsed < 0 || elapsed >= c.ttl) return 0;

    return c.ttl - elapsed;
}

/* ══════════════════════════════════════════════════════
   The boot sequence

   What plays on screen between "reestablish connection"
   and the site.

   ── The log is not decoration, and it does not lie ──
   The obvious version of this fetches BG.JPG and a couple
   of hex blobs. On a site whose entire argument is that its
   numbers were measured against something, inventing
   filenames would be the one dishonest thing on the page.

   So the counts are READ FROM THE ARRAYS THE SITE RENDERS
   FROM. Add a skill and the log says 28 without anyone
   touching it. There is a test asserting exactly that,
   because the failure mode otherwise is silent and
   embarrassing: a boot readout confidently reporting a
   number the site stopped having.
   ══════════════════════════════════════════════════════ */

import { SECTION_IDS } from "../LivingArchitecture/stages.ts";
import { SKILLS } from "../SkillOrbit/data.ts";
import { CASE_STUDIES } from "../../lib/caseStudies.ts";

/* ── The schedule ──────────────────────────────────────
   Every offset below is DERIVED from these three, never written twice. The
   sequence has been retimed twice now and both times the thing that would
   have broken silently is a hardcoded millisecond somewhere downstream.

   It was 2000ms flat and ended by simply fading out. That is the half of the
   entrance this redesign fixes: readers reported thinking the site was down,
   and a sequence that never says "that worked" leaves them to infer it. The
   confirmation beat is the answer, and it needs real time on screen — under a
   second is exactly how a reassurance becomes missable. */

/** Lines are emitted across this window. Unchanged pace: 7 rows, ~263ms apart. */
export const BOOT_EMIT_MS = 1580;

/** The green ALL SYSTEMS OPERATIONAL beat, after the log and before the fade. */
export const BOOT_CONFIRM_MS = 900;

/** The cross-fade, which OVERLAPS the tail rather than following it. */
export const BOOT_FADE_MS = 420;

/** Click to portfolio. Fade included, not added on top. */
export const BOOT_TOTAL_MS = BOOT_EMIT_MS + BOOT_CONFIRM_MS + BOOT_FADE_MS;

export interface BootLine {
    /** Left side of the row. */
    label: string;
    /** Right side. Absent for lines that are statements, not checks. */
    status?: string;
    /** Milliseconds after the click at which this line appears. */
    at: number;
}

/**
 * The readout, timed.
 *
 * A function rather than a constant so the counts are resolved at call time,
 * and so the test can compare a fresh result against the live arrays.
 */
export function bootSequence(): BootLine[] {
    const rows: Omit<BootLine, "at">[] = [
        { label: "carrier detected" },
        { label: "handshake", status: "OK" },
        { label: "scroll driver", status: "OK" },
        { label: `system atlas / ${SECTION_IDS.length} stages`, status: "OK" },
        { label: `orbital field / ${SKILLS.length} bodies`, status: "OK" },
        { label: `projects / ${CASE_STUDIES.length}`, status: "OK" },
        { label: "uplink restored" },
    ];

    const last = rows.length - 1;
    return rows.map((r, i) => ({
        ...r,
        // First at 0, last exactly at BOOT_EMIT_MS, evenly spaced between.
        at: Math.round((i / last) * BOOT_EMIT_MS),
    }));
}

/**
 * When the verdict lands — the instant the last log line does.
 *
 * The log stays on screen underneath it. A reader should see the checks AND
 * the conclusion, not have the evidence swapped out for the summary.
 */
export const BOOT_CONFIRM_AT = BOOT_EMIT_MS;

/** When the gate starts fading, i.e. once the confirmation has been read. */
export const BOOT_FADE_AT = BOOT_CONFIRM_AT + BOOT_CONFIRM_MS;

