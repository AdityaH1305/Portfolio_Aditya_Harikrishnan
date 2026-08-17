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

/* ── The clearance is one minute ────────────────────────
   It was a flat hour, then a 30–60 second roll, and it is now exactly a
   minute. The roll bought nothing a reader could perceive — a countdown they
   watch is already a different object from a cookie banner that remembers
   them, and a number that varies per visit only makes the rule harder to
   state. `TTL_MS` is now the whole rule.

   THE TTL IS STILL STORED ALONGSIDE THE TIMESTAMP. It is derivable from the
   constant now, so this looks redundant — it is not. The stored pair is what
   lets an old value be recognised and clamped, it is the format the pre-paint
   script in `app/layout.tsx` already parses, and it means changing this
   constant can never leave clearances written by a previous deploy running to
   a length nothing on the page agrees with. */
export const TTL_MS = 60_000;

export interface Clearance {
    /** When it was granted, in epoch ms. */
    at: number;
    /** How long it lasts, in ms. Stored, not inferred — see above. */
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
 * A stored TTL is clamped to `TTL_MS`. Rejecting an over-long one outright
 * would work too, but clamping also covers the case worth actually worrying
 * about: someone writing `"…:1e12"` by hand and never seeing the gate again.
 * It is also what makes a clearance from the old 30–60 second roll behave —
 * a shorter stored TTL is honoured as written and simply runs out sooner.
 */
export function parseClearance(raw: string | null): Clearance | null {
    if (raw === null) return null;

    const parts = raw.split(":");
    if (parts.length !== 2) return null;

    const at = Number(parts[0]);
    const ttl = Number(parts[1]);
    if (!Number.isFinite(at) || !Number.isFinite(ttl)) return null;
    if (ttl <= 0) return null;

    return { at, ttl: Math.min(ttl, TTL_MS) };
}

/**
 * A clearance that has ALREADY run out, for the reader who chooses to end
 * theirs early from the countdown chip.
 *
 * BACKDATED, NOT DELETED, and that distinction is the whole reason this
 * exists. Removing the key would make `parseClearance` return null — "no
 * clearance was ever granted" — and the chip, which keys off exactly that,
 * would vanish from the corner at the moment the reader pressed it instead of
 * flipping to "expired". Someone who just pressed something has to see what it
 * did.
 *
 * DATED TO THE EPOCH, not to `now - TTL_MS`. A clearance one TTL old is
 * expired at the current clock but comes back to life if the clock then moves
 * BACKWARDS by less than a minute — travel, DST, a corrected NTP sync — which
 * is the one case `shouldShowGate` already goes out of its way to handle in the
 * other direction. 1970 is expired under any clock a browser can report.
 */
export function expiredClearance(): string {
    return encodeClearance(0, TTL_MS);
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
   The finale

   What plays between the press and the site: the copy
   leaves, six blocks gather into one giant cube, and the
   cube shatters into the hero.

   ── It replaced a boot readout ──
   Seven log lines and a green verdict banner. They were a
   LOADING SCREEN, and the screen they interrupted was not
   loading anything — a different idea bolted to the end of
   a good one. The choreography is the transition now, and
   there are no words in it at all.

   The log's counts were read from `SECTION_IDS`, `SKILLS`
   and `CASE_STUDIES`, with a test asserting it could never
   report a number the site had stopped having. That test
   went with it, and nothing else asserts those counts — a
   real loss, recorded here rather than quietly dropped.

   ── Every offset is DERIVED ──
   Never written twice. This sequence has been retimed three
   times now and every time the thing that would have broken
   silently is a hardcoded millisecond somewhere downstream.
   `close()` and the entrance failsafe both key off
   `FINALE_MS` and follow whatever these say.
   ══════════════════════════════════════════════════════ */

/**
 * How long the copy takes to leave.
 *
 * It is STAGGERED across this window rather than fading as a block — see the
 * exit rules in globals.css. Nothing else keys off it; the convergence starts
 * on its own offset, deliberately earlier.
 */
export const EXIT_MS = 420;

/**
 * When the blocks start gathering.
 *
 * BEFORE THE COPY HAS FINISHED LEAVING, and that overlap is the point. Text
 * out *then* cubes in reads as two steps; starting the gather while the last
 * words are still going makes it one gesture.
 */
export const CONVERGE_AT = 180;

/** How long the gather takes. Long enough to watch, short enough to want. */
export const CONVERGE_MS = 900;

/** The merged cube holds here — the beat before it goes. */
export const MERGE_MS = 320;

/** When it shatters. Also when the entrance is released — see SignalGate.tsx. */
export const BURST_AT = CONVERGE_AT + CONVERGE_MS + MERGE_MS;

/** How long the debris takes to clear. */
export const BURST_MS = 900;

/** Click to unmount. The burst is included, not added on top. */
export const FINALE_MS = BURST_AT + BURST_MS;

