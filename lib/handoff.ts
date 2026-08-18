/* ══════════════════════════════════════════════════════
   The burst handoff

   One question, asked once per page load: did the reader
   come through the entrance, and if so, what were the
   fragments doing when it stopped drawing them?

   ── What it is for ──
   The gate's finale used to end with 27 fragments fading to
   nothing. They now go somewhere — `components/GlyphA/`
   catches them and builds a letter out of them. The two
   components are mounted as siblings under `app/page.tsx`
   with no props path between them, and only one of them
   exists on any given load.

   ── Why a singleton and not an event ──
   Same shape and same reasoning as `lib/entrance.ts` and
   `lib/lenis.ts`, but there is a second reason here that is
   specific and load-bearing.

   `GlyphA` is `dynamic({ ssr: false })`, so its chunk
   arrives some time after hydration. A CustomEvent
   dispatched at the burst would need a listener already
   attached — and the burst happens when the reader clicks,
   which may be the very first thing they do. A visitor who
   presses ENTER before the chunk lands would get an event
   into an empty room and no letter at all, intermittently,
   on exactly the machines slow enough to make it matter.

   A value that is WRITTEN once and READ whenever the reader
   is ready has no such window. The gate publishes and stops
   caring; the glyph collects when it mounts.
   ══════════════════════════════════════════════════════ */

/* `import type`, and it has to stay one. The alias is a bundler path that
   Node's ESM resolver knows nothing about — this survives in `handoff.test.ts`
   only because a type import is erased at runtime. The same reason `cubes.ts`
   gets away with a bare `./forces`. Turn it into a value import and the test
   stops resolving. */
import type { Fragment } from "@/components/SignalGate/finale";

export interface Burst {
    /** The 27 pieces, exactly as `shatter()` cut them. */
    readonly fragments: readonly Fragment[];
    /**
     * The burst's own instant, on `performance.now()`'s clock.
     *
     * Dated FORWARD when published: the gate publishes at the click and this
     * is `click + BURST_AT`, so the reader picks up a clock that is already
     * running rather than one that starts when it happens to look.
     */
    readonly at: number;
}

let pending: Burst | null = null;

/**
 * "The cube has come apart, and here is what it came apart into."
 *
 * Called from the gate at the CLICK, a full `BURST_AT` before anything can
 * read it. That gap is deliberate: `releaseEntrance()` runs its subscribers
 * synchronously and the glyph's subscriber is what calls `takeBurst()`, so
 * publishing next to that release would make two adjacent lines
 * order-dependent, with a silent fallback to a fresh `shatter()` if they were
 * ever swapped.
 *
 * The fragments are the gate's own — not a copy and not a re-cut — because
 * the letter has to be built from the pieces the reader watched leave.
 */
export function publishBurst(fragments: readonly Fragment[], at: number): void {
    pending = { fragments, at };
}

/**
 * Collect the burst, if there was one. Returns `null` on an ungated load.
 *
 * CONSUMING, not peeking. The letter assembles exactly once per page load;
 * leaving the value in place would have a remount — Fast Refresh, or React's
 * StrictMode double-invoke in development — replay the arrival on a letter
 * that is already standing there.
 */
export function takeBurst(): Burst | null {
    const b = pending;
    pending = null;
    return b;
}
