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
