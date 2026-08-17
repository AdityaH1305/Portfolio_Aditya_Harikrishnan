/* ══════════════════════════════════════════════════════
   The ECG trace

   The gate's one instrument, and the only moving figure on
   the entrance besides the cube field behind it.

   ── Why this exists ──
   Readers reported thinking the site was down. The entrance
   said "Signal lost" and offered a quiet control, and
   nothing on screen connected the two — so the fault read as
   real and the fix read as decoration.

   The state does the explaining for free. Contact lost is a
   FLATLINE; pressing the button starts a rhythm. Nobody
   needs that decoded — which is why the canvas has to STAY
   MOUNTED through the press, and for a long time it did not.
   See the effect in SignalGate.tsx.

   ── It used to have a carrier beside it ──
   `wave.ts` drew a radio carrier under the title: three
   drifting harmonics, a second moving line a few hundred
   pixels from this one, saying nearly the same thing. It was
   deleted, and this became the only trace. A heart monitor is
   the right figure of the two — mostly flat, punctuated by
   one sharp complex, so the fault is legible as an absence.

   Pure, so the shape is provable in node like blend.ts,
   layout.ts, flight.ts and cubes.ts. The canvas only plots
   what this returns.
   ══════════════════════════════════════════════════════ */

/** Points plotted across the trace. Enough for the spike to keep its edges. */
export const ECG_SAMPLES = 240;

/** Seconds per beat. 60 bpm — a calm monitor, not a panicking one. */
export const ECG_PERIOD = 1;

const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/** Deterministic hash → 0…1. No RNG state, so a frame is reproducible. */
function hash(a: number, b: number): number {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

/** A gaussian bump of height `h` centred at `c` with width `w`. */
function bump(x: number, c: number, w: number, h: number): number {
    const d = (x - c) / w;
    return h * Math.exp(-d * d);
}

/**
 * One PQRST complex over a normalised beat position `0…1`.
 *
 * The landmarks are the real ones, in the proportions a monitor draws them:
 * a small P bump, the sharp QRS (a deep narrow Q, the tall R spike, a deep S),
 * then the broad T wave. R is by far the largest feature, which is what makes
 * the shape read as a heartbeat rather than as a generic wobble — and it is
 * asserted in the tests for exactly that reason.
 *
 * Everything after the T wave is baseline, which is most of the cycle. That
 * silence is the point: it is what makes each beat an event.
 */
function complex(beat: number): number {
    return (
        bump(beat, 0.16, 0.032, 0.16) + // P
        bump(beat, 0.29, 0.008, -0.16) + // Q
        bump(beat, 0.32, 0.011, 1.0) + // R
        bump(beat, 0.355, 0.012, -0.32) + // S
        bump(beat, 0.52, 0.05, 0.26) // T
    );
}

/**
 * Trace height at position `u` (0…1 across the strip) at time `t` seconds.
 *
 * `live` is 0 while contact is lost and 1 once it is back, ramped by the
 * component so the trace comes alive rather than switching.
 *
 * The dead state is not perfectly flat, and that is deliberate:
 * a truly flat line reads as "nothing is running", while an occasional tick
 * reads as "something is listening and finding nothing" — which is the state
 * actually being described.
 *
 * The trace SCROLLS: `u` is a position on screen and the waveform moves
 * leftward under it, so the strip behaves like paper coming out of a monitor
 * rather than a shape that pulses in place.
 */
export function ecgAt(u: number, t: number, live: number): number {
    const L = live < 0 ? 0 : live > 1 ? 1 : live;

    /* Quantised into ~6 steps a second so a tick survives a few frames
       instead of strobing. */
    const slot = Math.floor(t * 6);
    const tick = hash(Math.floor(u * 80), slot);
    const dead = tick > 0.99 ? (hash(Math.floor(u * 240), slot) - 0.5) * 0.3 : 0;

    /* Position within the current beat at this point on the strip. Two beats
       are visible at once, so the reader sees a rhythm rather than one shape. */
    const beat = (((u * 2 - t / ECG_PERIOD) % 1) + 1) % 1;

    return clamp(dead * (1 - L) + complex(beat) * L);
}

/**
 * The monitor's sweep head, 0…1 across the strip.
 *
 * Wraps continuously — a discontinuity here would show as the head jumping
 * backwards, which no monitor does.
 */
export function sweepAt(t: number): number {
    const p = (t / (ECG_PERIOD * 2)) % 1;
    return p < 0 ? p + 1 : p;
}

/** Largest absolute height across one frame. Used by the tests, not the canvas. */
export function peakAt(n: number, t: number, live: number): number {
    let peak = 0;
    for (let i = 0; i < n; i++) {
        const v = Math.abs(ecgAt(i / (n - 1), t, live));
        if (v > peak) peak = v;
    }
    return peak;
}
