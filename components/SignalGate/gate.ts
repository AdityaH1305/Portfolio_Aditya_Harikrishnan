/* ══════════════════════════════════════════════════════
   Signal gate timing

   Pure, so the one rule that matters — "having cleared it,
   you are not asked again for an hour" — is provable in
   node instead of by sitting and waiting.

   Everything here is defensive about the stored value on
   purpose. It comes from localStorage, which is user-
   writable, shared across tabs, survives deploys, and can
   hold anything at all. A gate that throws on a corrupt key
   would take the whole page down with it, since it renders
   above the content.
   ══════════════════════════════════════════════════════ */

export const GATE_KEY = "signal:cleared";

/** How long a clearance lasts. */
export const GATE_TTL_MS = 60 * 60 * 1000;

/**
 * Should the gate be shown?
 *
 * `stored` is the raw localStorage string, so `null` (never cleared) and
 * garbage both have to resolve to *something*. Both resolve to "show it":
 * an unexpected visit to the gate is a small cost, being permanently locked
 * out of your own entrance because a key got mangled is not.
 *
 * A stored time in the FUTURE also shows the gate. That happens when the
 * system clock moves backwards — travel, DST, a corrected NTP sync — and the
 * alternative is a clearance that outlives its hour by however far the clock
 * jumped.
 */
export function shouldShowGate(now: number, stored: string | null): boolean {
    if (stored === null) return true;

    const cleared = Number(stored);
    if (!Number.isFinite(cleared)) return true;

    const elapsed = now - cleared;
    if (elapsed < 0) return true;

    return elapsed >= GATE_TTL_MS;
}

/** Milliseconds until the gate is due again. 0 once it is. */
export function msUntilNextGate(now: number, stored: string | null): number {
    if (shouldShowGate(now, stored)) return 0;
    return GATE_TTL_MS - (now - Number(stored));
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

/** Click to portfolio. Exactly two seconds, fade included, not added on top. */
export const BOOT_TOTAL_MS = 2000;

/** The cross-fade, which OVERLAPS the tail rather than following it. */
export const BOOT_FADE_MS = 420;

/** Lines are emitted across this window; the last lands as the fade starts. */
export const BOOT_EMIT_MS = BOOT_TOTAL_MS - BOOT_FADE_MS;

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
        { label: `case studies / ${CASE_STUDIES.length}`, status: "OK" },
        { label: "uplink restored" },
    ];

    const last = rows.length - 1;
    return rows.map((r, i) => ({
        ...r,
        // First at 0, last exactly at BOOT_EMIT_MS, evenly spaced between.
        at: Math.round((i / last) * BOOT_EMIT_MS),
    }));
}

/** When the gate starts fading. Equal to the last line's time, by design. */
export const BOOT_FADE_AT = BOOT_EMIT_MS;

