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
 * Length of the chrome fade in globals.css.
 *
 * Consumers that stop work entirely — the atlas pauses its draw loop — defer
 * by this long on the way IN so the freeze lands after the fade rather than
 * during it, and act immediately on the way out. Keep in step with the
 * `transition: opacity 700ms` on `.living-architecture-canvas`.
 */
export const ZONE_FADE_MS = 700;
