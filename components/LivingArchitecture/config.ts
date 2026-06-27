/* ══════════════════════════════════════════════════════
   Living Architecture — Configuration
   Phase 1: Core + Branches + Clusters + Signals

   All visual and timing constants live here.
   Adjust these to tune the system without touching
   the render or animation logic.
   ══════════════════════════════════════════════════════ */

export const GOLD = { r: 212, g: 175, b: 55 };

/** Build an rgba string in the portfolio's gold accent. */
export function gold(opacity: number): string {
  return `rgba(${GOLD.r},${GOLD.g},${GOLD.b},${Math.max(0, Math.min(1, opacity))})`;
}

// ── Display ────────────────────────────────────────────

export const DPR_CAP = 1.5;
export const COMPACT_THRESHOLD = 200; // canvas CSS‑px width below which compact mode activates

// ── Core ───────────────────────────────────────────────

export const CORE_SEGMENTS = 5;
export const CORE_SEGMENTS_COMPACT = 3;
export const CORE_SEG_LEN_MIN = 5;
export const CORE_SEG_LEN_MAX = 9;
export const CORE_SEG_LEN_MIN_COMPACT = 3;
export const CORE_SEG_LEN_MAX_COMPACT = 5;
export const CORE_OPACITY = 0.5;
export const CORE_BREATHE_PERIOD = 3.5; // seconds per full cycle
export const CORE_BREATHE_AMOUNT = 1.5; // px of length oscillation
export const CORE_LINE_WIDTH = 1;
export const CORE_GLOW_RADIUS = 30;
export const CORE_GLOW_RADIUS_COMPACT = 15;
export const CORE_GLOW_OPACITY = 0.04;

// ── Layout ─────────────────────────────────────────────

export const DESKTOP_CORE_Y = 0.28;  // fraction of canvas height
export const COMPACT_CORE_Y = 0.30;

// ── Branches ───────────────────────────────────────────

export interface BranchDef {
  baseAngle: number;      // radians (0 = right, PI/2 = down)
  length: number;         // total path length in px
  segmentCount: number;   // joints along the path
  angleVariance: number;  // max angular deviation per joint (radians)
  opacity: number;
  width: number;          // stroke width in px
  seed: number;           // PRNG seed for deterministic path
}

/*
 * Three branches with distinct character:
 *   0 — Primary (down‑right, longest, boldest)
 *   1 — Secondary (down‑left, medium, quieter)
 *   2 — Tertiary (steep down, shortest, subtlest)
 */
export const BRANCH_DEFS: BranchDef[] = [
  {
    baseAngle: Math.PI / 2 - 0.44,
    length: 60,
    segmentCount: 8,
    angleVariance: 0.09,
    opacity: 0.09,
    width: 0.75,
    seed: 42,
  },
  {
    baseAngle: Math.PI / 2 + 0.35,
    length: 45,
    segmentCount: 6,
    angleVariance: 0.07,
    opacity: 0.065,
    width: 0.65,
    seed: 137,
  },
  {
    baseAngle: Math.PI / 2 - 0.12,
    length: 35,
    segmentCount: 5,
    angleVariance: 0.06,
    opacity: 0.05,
    width: 0.6,
    seed: 256,
  },
];

export const BRANCH_DEFS_COMPACT: BranchDef[] = [
  {
    baseAngle: Math.PI / 2 - 0.3,
    length: 18,
    segmentCount: 4,
    angleVariance: 0.06,
    opacity: 0.09,
    width: 0.6,
    seed: 42,
  },
];

export const BRANCH_START_OFFSET = 5;          // px from core center
export const BRANCH_START_OFFSET_COMPACT = 3;

// ── Clusters (nascent subsystems at branch tips) ──────

export const CLUSTER_SEG_MIN = 2;
export const CLUSTER_SEG_MAX = 3;
export const CLUSTER_SEG_LEN_MIN = 3;
export const CLUSTER_SEG_LEN_MAX = 5;
export const CLUSTER_RADIUS = 10;           // spread in px
export const CLUSTER_RADIUS_COMPACT = 6;
export const CLUSTER_BREATHE_MIN = 4;       // seconds
export const CLUSTER_BREATHE_MAX = 6;
export const CLUSTER_BREATHE_AMOUNT = 0.8;  // px
export const CLUSTER_BASE_OPACITY = 0.25;
export const CLUSTER_LINE_WIDTH = 0.8;

// ── Signals ────────────────────────────────────────────

export const SIGNAL_MAX = 3;
export const SIGNAL_MAX_COMPACT = 1;
export const SIGNAL_RADIUS = 1.5;
export const SIGNAL_GLOW_RADIUS = 4;
export const SIGNAL_OPACITY_MIN = 0.3;
export const SIGNAL_OPACITY_MAX = 0.45;
export const SIGNAL_SPEED_MIN = 25;         // px per second
export const SIGNAL_SPEED_MAX = 50;
export const SIGNAL_SPAWN_MIN = 2.5;        // seconds between spawns
export const SIGNAL_SPAWN_MAX = 4.5;
export const SIGNAL_FLASH_DURATION = 0.2;   // seconds
export const SIGNAL_FLASH_BOOST = 0.2;      // additive opacity on arrival

// ── Growth animation (initial boot‑up) ────────────────

export const FADE_IN_DURATION = 1.8;                 // seconds
export const GROWTH_DURATION = 2.0;                   // seconds per branch
export const GROWTH_DELAYS = [0.5, 1.0, 1.3];        // stagger per branch
export const GROWTH_DELAYS_COMPACT = [0.5];
export const CLUSTER_APPEAR_THRESHOLD = 0.85;         // branch growth at which cluster fades in
export const SIGNAL_READY_THRESHOLD = 0.92;           // all branches must exceed this before signals spawn

// ── Compact mode ──────────────────────────────────────

export const COMPACT_GLOBAL_OPACITY = 0.5;
