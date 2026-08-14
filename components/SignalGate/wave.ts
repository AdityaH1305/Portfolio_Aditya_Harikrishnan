/* ══════════════════════════════════════════════════════
   The carrier

   A trace across the gate: flatlined while contact is lost,
   alive once it is back. Pure, so the interesting half is
   provable in node like blend.ts, layout.ts and flight.ts —
   the canvas file only plots what this returns.

   Deliberately the same instrument as the oscilloscope ring
   in Cursor.tsx. The gate should read as part of the site
   rather than as a splash screen bolted in front of it.
   ══════════════════════════════════════════════════════ */

/** Points plotted across the trace. Enough to look continuous, few enough to be free. */
export const WAVE_SAMPLES = 220;

/** Deterministic hash → 0…1. No RNG state, so a frame can be reproduced. */
function hash(a: number, b: number): number {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

/**
 * Trace height at sample `i`, in -1…1.
 *
 * `live` is 0 while the signal is lost and 1 once it is back; the component
 * ramps it so the trace comes alive rather than switching.
 *
 * Dead is not perfectly flat. A truly flat line reads as "nothing is
 * running"; an occasional tick reads as "something is listening and finding
 * nothing", which is the actual state being described.
 */
export function waveAt(
    i: number,
    n: number,
    t: number,
    live: number,
): number {
    if (n <= 1) return 0;
    const u = i / (n - 1);
    const L = live < 0 ? 0 : live > 1 ? 1 : live;

    /* Dead: baseline, with a rare spike. Quantising time into ~6 steps a
       second keeps a tick visible for a few frames instead of strobing. */
    const slot = Math.floor(t * 6);
    const tick = hash(Math.floor(i / 3), slot);
    const dead = tick > 0.985 ? (hash(i, slot) - 0.5) * 0.55 : 0;

    /* Live: three harmonics drifting at different rates, so the trace never
       repeats on a visible cycle. */
    const p = u * Math.PI * 2;
    const alive =
        Math.sin(p * 3 - t * 2.2) * 0.55 +
        Math.sin(p * 7 + t * 1.3) * 0.22 +
        Math.sin(p * 13 - t * 3.1) * 0.1;

    /* Taper to zero at both ends, so the trace resolves into the baseline
       instead of being cut off by the edge of the canvas. */
    const envelope = Math.sin(u * Math.PI);

    return clamp(dead * (1 - L) + alive * L * envelope);
}

/** Peak absolute height across one frame. Used by the tests, not the canvas. */
export function peakAt(n: number, t: number, live: number): number {
    let peak = 0;
    for (let i = 0; i < n; i++) {
        const v = Math.abs(waveAt(i, n, t, live));
        if (v > peak) peak = v;
    }
    return peak;
}
