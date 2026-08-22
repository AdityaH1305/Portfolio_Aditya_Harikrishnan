/* ══════════════════════════════════════════════════════
   Immersive-zone broadcast

   CaseStudyZone announces when the reader enters and leaves
   the case-study region; the atlas and the atmosphere
   parallax listen and stand down while they are in there.

   An event rather than lifted state or context: every
   consumer is mounted elsewhere in the tree with no props
   path to the zone, two of them behind
   `dynamic({ ssr: false })`, and all three only care inside
   an effect. Context would buy nothing and cost a re-render
   on a scroll boundary.

   The name lives here rather than being typed as a bare
   string at each end — which is what `cursor:charge` does —
   because this one has three call sites, and a typo in any
   of them fails silently as a listener that never fires.
   ══════════════════════════════════════════════════════ */

/** `detail: { active: boolean }`. Fires on both edges. */
export const ZONE_EVENT = "zone:immersive";

/**
 * "Stand down, something else owns the screen."
 *
 * `detail: { source: string; quiet: boolean }`. Separate from ZONE_EVENT
 * because that one also drives the case-study room's CSS — a section that
 * wants the atlas quiet without repainting the whole page in indigo needs
 * its own signal.
 *
 * The `source` is load-bearing. Listeners must track reasons as a SET and
 * resume only when the last one clears; a bare boolean means whichever
 * section reports last wins, and the atlas comes back to life underneath a
 * section that is still asking for quiet.
 */
export const ATLAS_QUIET_EVENT = "atlas:quiet";

/**
 * "Paint the cursor this colour."
 *
 * `detail: { rgb: [number, number, number] | null }` — a triple to tint with,
 * or `null` to fall back to `--accent-rgb`.
 *
 * The signal gate dispatches it so the cursor participates in the alert
 * instead of being the one element still site-blue on a red screen, and it
 * follows the gate's phases from there: red, then blue, then green. Reverting
 * on unmount is the case that matters — a cursor left red over the portfolio
 * would read as a fault that never cleared.
 *
 * Named here rather than typed as a bare string at each end, for the same
 * reason ATLAS_QUIET_EVENT is: a typo in either half fails silently as a
 * listener that never fires. (`cursor:charge` predates this module and is
 * still a bare string in two files — it should move here next time it is
 * touched.)
 */
export const CURSOR_TINT_EVENT = "cursor:tint";
