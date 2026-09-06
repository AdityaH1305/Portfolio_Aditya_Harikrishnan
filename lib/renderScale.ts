/* ══════════════════════════════════════════════════════
   Render scale — the entrance's backing-store multiplier

   The entrance is the most fill-rate-hungry thing on the site: a
   full-viewport canvas, twenty-seven fragments, six translucent faces each,
   every one filled AND stroked. Measured at 1920x1080 with
   devicePixelRatio 2, one burst frame costs about 19ms even after the
   dirty-rect clear — comfortably past a 60fps budget before the hero's
   SplitText timeline, Lenis and the atlas have done anything.

   At devicePixelRatio 1 the same frame is 6.3ms. The curve between is
   steep and NOT linear in pixel count — 1.25 already costs more than twice
   what 1 does — so backing-store scale is the one lever with enough travel
   to matter.

   ── Why this is measured and not inferred ──
   `lib/deviceTier.ts` sniffs cores, memory and pointer type. Those say
   something about the CPU and nothing at all about fill rate, and fill rate
   is what this effect is bound by: an eight-core laptop on integrated
   graphics passes every check in that file as "high" and still cannot push
   8.3 million pixels sixty times a second. So the entrance watches its own
   frame times while it is idling and decides from evidence.

   ── The default is full quality ──
   `scaleFor` returns 1 for anything it has not seen enough of, and the
   singleton below starts at 1. A machine that is keeping up, or that has
   not been measured yet, renders exactly as it did before this module
   existed. Quality is given up only where the alternative is dropped
   frames, which is not a trade — it is the same picture, arriving.
   ══════════════════════════════════════════════════════ */

/** Frames to see before the estimate is worth anything. */
export const MIN_SAMPLES = 24;

/**
 * How much heavier a burst frame is than an idle one.
 *
 * WHAT IS MEASURED IS THE DRAW, NOT THE FRAME. Timing the gap between
 * ticker calls would report ~16.7ms on every healthy machine, because that
 * is the cadence rAF runs at and not the work done inside it — a machine
 * with 90% of its budget spare and one with 5% look identical. So the gate
 * times its own draw call.
 *
 * That draw is the idle field: six blocks, six faces each. The burst is
 * twenty-seven fragments of the same six faces. With the clear now bounded
 * to the painted region, what is left is fill and stroke, and both scale
 * with the number of quads — so 27/6 is the projection, rounded down a
 * little because the fragments are smaller than the blocks by the time they
 * are flying.
 */
export const BURST_LOAD_FACTOR = 4;

/** A 60Hz frame, and the budget the projection is judged against. */
const FRAME_MS = 1000 / 60;

/**
 * Projected burst cost, in milliseconds, from a measured idle draw.
 */
export function projectBurst(idleDrawMs: number): number {
    return idleDrawMs * BURST_LOAD_FACTOR;
}

/**
 * Thresholds on the PROJECTED BURST cost, worst first, read as "at least
 * this slow". Wide steps on purpose: this is decided once per page load and
 * never revisited, so a borderline machine settling on either neighbour is
 * fine while oscillating between them would not be — and there is no
 * hysteresis here to prevent that.
 *
 * Nothing degrades until the projection passes a 60Hz frame. A machine that
 * is going to make its budget keeps every pixel.
 */
const STEPS: readonly (readonly [ms: number, scale: number])[] = [
    [FRAME_MS * 1.8, 0.5],
    [FRAME_MS * 1.35, 0.65],
    [FRAME_MS, 0.8],
];

/**
 * The backing-store multiplier for a machine whose burst is projected to
 * cost `ms` a frame. Pure.
 *
 * `samples` guards against deciding on a handful of frames — the first few
 * after mount include layout, font swaps and the dynamic chunk landing, and
 * are far slower than the steady state they would be taken to represent.
 */
export function scaleFor(ms: number, samples: number): number {
    if (!(ms > 0) || samples < MIN_SAMPLES) return 1;
    for (const [threshold, scale] of STEPS) {
        if (ms >= threshold) return scale;
    }
    return 1;
}

/**
 * A running median-ish estimate that cannot be dragged by one bad frame.
 *
 * A mean is the obvious choice and the wrong one: a single 400ms stall — a
 * tab restore, a long GC, the dynamic import resolving — moves a 24-frame
 * mean by 16ms all on its own, which is the entire decision. This keeps the
 * middle value of the samples it has seen instead.
 */
export class FrameEstimate {
    private samples: number[] = [];
    /** Frames longer than this were not frames; see lib/frameBudget.ts. */
    static readonly CEILING_MS = 200;
    /** Enough to be stable, small enough that the sort stays trivial. */
    static readonly WINDOW = 60;

    add(ms: number): void {
        if (!(ms > 0) || ms > FrameEstimate.CEILING_MS) return;
        this.samples.push(ms);
        if (this.samples.length > FrameEstimate.WINDOW) this.samples.shift();
    }

    get count(): number {
        return this.samples.length;
    }

    /** The median of what has been seen, or 0 if nothing has. */
    median(): number {
        const n = this.samples.length;
        if (n === 0) return 0;
        const sorted = [...this.samples].sort((a, b) => a - b);
        return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }

    /** What this machine should render the burst at. */
    scale(): number {
        return scaleFor(projectBurst(this.median()), this.count);
    }
}

// ── The impure shell ───────────────────────────────────

let current = 1;

/**
 * Publish the scale the entrance settled on.
 *
 * Written by the gate at the press, so the change lands on the one frame
 * where the whole screen is already turning over — the copy leaving, the
 * blocks gathering. Applied during the idle drift instead, the same change
 * is a visible pop in sharpness with nothing to cover it.
 */
export function setRenderScale(scale: number): void {
    current = scale > 0 && scale <= 1 ? scale : 1;
}

/**
 * The multiplier to fold into a canvas's devicePixelRatio.
 *
 * 1 until the gate has decided, which is also what a deep link to a case
 * study gets — there is no gate there to measure anything, and those routes
 * are not running this effect.
 */
export function renderScale(): number {
    return current;
}

/** Test seam. Never call this from the app. */
export function resetRenderScale(): void {
    current = 1;
}
