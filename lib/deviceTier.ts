/* ══════════════════════════════════════════════════════
   Device tier

   What this machine can afford, decided ONCE, before anything has had a
   chance to drop a frame.

   The site had no device gating of any kind: the atlas, the orbit, the glyph
   and the entrance all ran at full quality on a phone, and the only thing
   that ever stood down was the atlas's own governor — which is reactive, so
   it costs a second of dropped frames to learn what a cheap sniff of
   `navigator` could have said at mount.

   ── Why the rule is allowed to be crude ──
   None of these signals is reliable alone. `deviceMemory` is Chromium-only
   and quantised to powers of two; `hardwareConcurrency` counts threads the
   tab may never get; a high-DPR phone and a high-DPR laptop look alike.
   That is survivable because THE COST OF BEING WRONG IS ASYMMETRIC: a "low"
   verdict on a capable machine loses a slightly denser starfield and a
   slightly softer canvas, while a "high" verdict on a weak one is exactly
   the dropped frames this exists to prevent. So `tierFor` leans toward
   caution, and `lib/frameBudget.ts` still catches whatever it misses.

   ── Two rules for callers ──
   1. RESOLVE INSIDE AN EFFECT, NEVER DURING RENDER. The home page is
      server-rendered under an overlay, and `app/layout.tsx` already forces
      `suppressHydrationWarning` on `<html>` for one specific, documented
      reason. Reading `navigator` during render would hand the server and the
      client different markup and add a second one.
   2. It is a hint about DRAWING, never about content. Nothing here may
      remove text, a link or a control. `prefers-reduced-motion` and
      `scripting: none` are what handle "show me less", and those are about
      intent rather than horsepower.

   The decision itself is pure and lives in `tierFor`, so it is provable in
   node — the same split `gate.ts`, `blend.ts` and `flight.ts` already use.
   ══════════════════════════════════════════════════════ */

export type DeviceTier = "low" | "mid" | "high";

/**
 * Everything the decision is allowed to look at.
 *
 * `cores` and `memory` use **0 for "not disclosed"**, which is what Safari
 * reports for both. That is the trap this type exists to make visible: read
 * naively, an undisclosed core count is a machine with no cores, and every
 * Safari visitor is demoted to the lowest tier on the site's best hardware.
 */
export interface DeviceSignals {
    /** The browser's Data Saver setting — a stated preference, not a guess. */
    saveData: boolean;
    /** `navigator.hardwareConcurrency`, or 0 if undisclosed. */
    cores: number;
    /** `navigator.deviceMemory` in GB, or 0 if undisclosed. */
    memory: number;
    /** `(pointer: coarse)` — a touch screen. */
    coarse: boolean;
    /** `devicePixelRatio`. */
    dpr: number;
}

/** The whole rule, as one pure function. */
export function tierFor(s: DeviceSignals): DeviceTier {
    /* Data Saver outranks every inference below it. Someone who has asked
       their browser to spend less is not asking for six animated canvases. */
    if (s.saveData) return "low";

    /* Only a value that is BOTH present and low is evidence. See the note on
       `DeviceSignals` — this is the line that decides Safari's fate. */
    if ((s.cores > 0 && s.cores <= 4) || (s.memory > 0 && s.memory <= 4)) {
        return "low";
    }

    /* A coarse pointer at high DPR is a phone. Every canvas here is
       full-viewport, so the backing store dominates and it scales with the
       SQUARE of the ratio: a 3x screen is nine times the pixels of a 1x one
       for exactly the same drawing. */
    if (s.coarse && s.dpr >= 2.5) return "low";
    if (s.coarse) return "mid";

    /* Undisclosed on a fine pointer is a desktop browser being private —
       far likelier a Mac running Safari than a machine in trouble. */
    if (s.cores === 0 && s.memory === 0) return "high";

    return s.cores >= 8 && (s.memory === 0 || s.memory >= 8) ? "high" : "mid";
}

/**
 * An EXTRA backing-store ceiling, applied on top of whatever cap a canvas
 * already chose — never instead of it.
 *
 * Each canvas picked its own number for its own reasons: the atlas and the
 * orbit cap at 1.5, the glyph and the entrance at 2. Replacing those with
 * this would RAISE the first pair to 2 on a desktop, which is a device tier
 * making capable machines work harder — the exact opposite of the point. So
 * every consumer reads
 *
 *     Math.min(window.devicePixelRatio || 1, <its own cap>, dprCap(tier))
 *
 * and `high` is deliberately 2, the largest cap in use, so that on capable
 * hardware this term can never be the binding one and nothing gets softer
 * than it was before this file existed.
 *
 * Where it bites is a phone. `GlyphA` paints the full viewport, so at 2x on
 * a 3x screen it draws four times the pixels a 1x screen needs — for a letter
 * of flat translucent quads with no fine detail to resolve.
 */
export function dprCap(tier: DeviceTier): number {
    return tier === "low" ? 1 : tier === "mid" ? 1.5 : 2;
}

/**
 * Where the atlas's own governor should START on this device.
 *
 * The governor only ever learns by dropping frames first — 60 samples above
 * 24ms before it reacts. On hardware that was never going to hold 60fps that
 * is a second of visible stutter to reach a conclusion available at mount.
 */
export function startPerfLevel(tier: DeviceTier): number {
    return tier === "low" ? 1 : 0;
}

// ── The impure shell ───────────────────────────────────

let cached: DeviceTier | null = null;

/**
 * A `?tier=` override, so the low path can be opened on a desktop.
 *
 * Without it the mobile branch is reachable only on an actual phone, which in
 * practice means it is looked at only once it is already broken.
 */
function override(): DeviceTier | null {
    try {
        const v = new URLSearchParams(window.location.search).get("tier");
        return v === "low" || v === "mid" || v === "high" ? v : null;
    } catch {
        /* A malformed URL must never be why the page draws nothing. */
        return null;
    }
}

/** Read the signals off this browser. */
export function readSignals(): DeviceSignals {
    const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
    };
    let coarse = false;
    try {
        coarse = window.matchMedia("(pointer: coarse)").matches;
    } catch {
        coarse = false;
    }
    return {
        saveData: nav.connection?.saveData === true,
        cores: nav.hardwareConcurrency ?? 0,
        memory: nav.deviceMemory ?? 0,
        coarse,
        dpr: window.devicePixelRatio || 1,
    };
}

/**
 * What this device can afford to draw. Safe to call from anywhere
 * client-side; the work happens once per page load.
 */
export function deviceTier(): DeviceTier {
    if (cached) return cached;
    if (typeof window === "undefined") return "high";
    cached = override() ?? tierFor(readSignals());
    return cached;
}
