/* ══════════════════════════════════════════════════════
   Frame budget

   The reactive half of the pair `lib/deviceTier.ts` describes: that file
   guesses what a machine can afford BEFORE anything has drawn, and this one
   measures what it actually managed and degrades when the guess was wrong.
   deviceTier's own comment has named this module since it was written — it
   simply did not exist, so the only thing on the site that ever adapted was
   the atlas, which grew a private copy of this logic inline.

   That gap is why this exists. `#stack` is the ONE region where the atlas
   deliberately stands down (see ATLAS_QUIET_EVENT) and SkillOrbit is the sole
   animating canvas — so it was also the one region on the page with no
   reactive degradation at all. Everywhere else a struggling machine
   self-corrects within about a second; there it just kept dropping frames.

   ── Pure, so it can be proven in node ──
   Same split as `gate.ts`, `blend.ts`, `flight.ts` and `layout.ts`: the
   decision is arithmetic and lives here, the canvas that consumes it is not
   and does not. A governor is exactly the kind of thing that looks right in
   review and oscillates on real hardware, and oscillation is worse than the
   stutter it is meant to cure — a canvas visibly changing quality twice a
   second reads as a bug.
   ══════════════════════════════════════════════════════ */

/** Frames averaged before the level is allowed to move. */
export const SAMPLE_WINDOW = 60;

/** Thresholds sit either side of a 60Hz frame (16.7ms) with a wide gap. */
export const DEGRADE_ABOVE_MS = 24;
export const RECOVER_BELOW_MS = 18;

/** Slower to recover than to degrade: one good stretch must not bounce a
    struggling device straight back into dropping frames. */
export const DEGRADE_HOLD_MS = 2000;
export const RECOVER_HOLD_MS = 4000;

/**
 * A frame this long was not a frame.
 *
 * rAF hands back the whole time a backgrounded tab was away, and a tab
 * restore, a breakpoint or a long GC arrives here as one enormous sample.
 * Averaged in, a single 1000ms stall adds ~16.7ms to a 60-frame mean — on
 * its own enough to cross DEGRADE_ABOVE_MS and drop the quality of a canvas
 * that was holding 60fps perfectly well. Discarded rather than clamped: the
 * sample carries no information about what this machine can draw, so the
 * honest thing is not to count it. The atlas's inline governor does not do
 * this, which is a latent false-degrade on every tab switch.
 */
export const SAMPLE_CEILING_MS = 200;

export interface FrameBudget {
    /** 0 is full quality. What each level costs is the caller's business. */
    readonly level: number;
    readonly accumMs: number;
    readonly samples: number;
    /** Timestamp before which the level may not move again. */
    readonly holdUntil: number;
}

export function createBudget(level = 0): FrameBudget {
    return { level, accumMs: 0, samples: 0, holdUntil: 0 };
}

/**
 * Fold one frame into the budget.
 *
 * @param b       current state
 * @param rawMs   how long the last frame actually took
 * @param now     a monotonic clock, same units, for the hold windows
 * @param maxLevel highest level this caller knows how to render
 */
export function advance(
    b: FrameBudget,
    rawMs: number,
    now: number,
    maxLevel: number,
): FrameBudget {
    if (!(rawMs >= 0) || rawMs > SAMPLE_CEILING_MS) return b;

    const accumMs = b.accumMs + rawMs;
    const samples = b.samples + 1;
    if (samples < SAMPLE_WINDOW) return { ...b, accumMs, samples };

    // Window complete: judge it, then start a fresh one either way.
    const avg = accumMs / samples;
    const cleared = { level: b.level, accumMs: 0, samples: 0, holdUntil: b.holdUntil };
    if (now < b.holdUntil) return cleared;

    if (avg > DEGRADE_ABOVE_MS && b.level < maxLevel) {
        return { ...cleared, level: b.level + 1, holdUntil: now + DEGRADE_HOLD_MS };
    }
    if (avg < RECOVER_BELOW_MS && b.level > 0) {
        return { ...cleared, level: b.level - 1, holdUntil: now + RECOVER_HOLD_MS };
    }
    return cleared;
}
