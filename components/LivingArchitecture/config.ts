/* ══════════════════════════════════════════════════════
   Living Architecture — Configuration
   Phase 3: Large-scale right-weighted system atlas

   All visual, layout, and timing constants live here.
   Organized by breakpoint mode for responsive rendering.
   ══════════════════════════════════════════════════════ */

// ── Color ──────────────────────────────────────────────

export const GOLD = { r: 212, g: 175, b: 55 };

/** Build an rgba string in the portfolio's gold accent. */
export function gold(opacity: number): string {
  return `rgba(${GOLD.r},${GOLD.g},${GOLD.b},${Math.max(0, Math.min(1, opacity))})`;
}

// ── Breakpoint Modes ───────────────────────────────────
// Derived from viewport width, NOT canvas width.

export type BreakpointMode = "desktop" | "tablet" | "mobile";

export const BREAKPOINT_DESKTOP = 1024;
export const BREAKPOINT_TABLET = 768;

export function getBreakpointMode(viewportWidth: number): BreakpointMode {
  if (viewportWidth >= BREAKPOINT_DESKTOP) return "desktop";
  if (viewportWidth >= BREAKPOINT_TABLET) return "tablet";
  return "mobile";
}

// ── Display ────────────────────────────────────────────

export const DPR_CAP = 1.5;

// ── Draw Zone (fraction of viewport) ───────────────────
// The engine clips ALL rendering to this zone.
// The left boundary protects text, navigation, and CTAs.

export interface DrawZone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const DRAW_ZONES: Record<BreakpointMode, DrawZone> = {
  desktop: { left: 0.52, right: 0.99, top: 0.02, bottom: 0.98 },
  tablet: { left: 0.60, right: 0.98, top: 0.05, bottom: 0.95 },
  mobile: { left: 0.55, right: 0.96, top: 0.25, bottom: 0.90 },
};

// ── Core Position (fraction of viewport) ───────────────

export const CORE_POSITIONS: Record<BreakpointMode, { x: number; y: number }> =
  {
    desktop: { x: 0.74, y: 0.36 },
    tablet: { x: 0.78, y: 0.40 },
    mobile: { x: 0.80, y: 0.50 },
  };

// ── Core Geometry ──────────────────────────────────────

export interface CoreConfig {
  segments: number;
  segLenMin: number;
  segLenMax: number;
  glowRadius: number;
  glowOpacity: number;
  haloRadius: number;
  haloOpacity: number;
  lineWidth: number;
  breatheAmount: number;
}

export const CORE_CONFIGS: Record<BreakpointMode, CoreConfig> = {
  desktop: {
    segments: 7,
    segLenMin: 10,
    segLenMax: 18,
    glowRadius: 70,
    glowOpacity: 0.06,
    haloRadius: 110,
    haloOpacity: 0.025,
    lineWidth: 1.4,
    breatheAmount: 2.0,
  },
  tablet: {
    segments: 5,
    segLenMin: 7,
    segLenMax: 13,
    glowRadius: 45,
    glowOpacity: 0.05,
    haloRadius: 70,
    haloOpacity: 0.018,
    lineWidth: 1.2,
    breatheAmount: 1.5,
  },
  mobile: {
    segments: 4,
    segLenMin: 5,
    segLenMax: 10,
    glowRadius: 28,
    glowOpacity: 0.04,
    haloRadius: 0,
    haloOpacity: 0,
    lineWidth: 1.0,
    breatheAmount: 0,
  },
};

// ── Branch Roles & Definitions ─────────────────────────

export type BranchRole = "trunk" | "primary" | "secondary" | "aspiration";

export interface BranchDef {
  /** Stable identity that persists across stages. */
  id: string;
  /** Semantic role — controls draw order, width scale, transition timing. */
  role: BranchRole;
  /** Base angle in radians (0 = right, PI/2 = down). */
  baseAngle: number;
  /** Target path length in px (desktop scale). */
  length: number;
  /** Number of joints along the path. */
  segmentCount: number;
  /** Max angular deviation per joint (radians). */
  angleVariance: number;
  /** Target stroke opacity. */
  opacity: number;
  /** Base stroke width in px (before role scaling). */
  width: number;
  /** PRNG seed for deterministic path shape. */
  seed: number;
}

// ── Branch Rendering Limits per Breakpoint ─────────────

export interface BranchConfig {
  maxBranches: number;
  startOffset: number;
  maxSignals: number;
  maxConduits: number;
}

export const BRANCH_CONFIGS: Record<BreakpointMode, BranchConfig> = {
  desktop: { maxBranches: 10, startOffset: 14, maxSignals: 8, maxConduits: 3 },
  tablet: { maxBranches: 6, startOffset: 10, maxSignals: 4, maxConduits: 1 },
  mobile: { maxBranches: 3, startOffset: 8, maxSignals: 1, maxConduits: 0 },
};

/** Width multiplier per role — applied on top of BranchDef.width. */
export const ROLE_WIDTH_SCALE: Record<BranchRole, number> = {
  trunk: 1.5,
  primary: 1.0,
  secondary: 0.85,
  aspiration: 0.9,
};

/** Transition delay per role (fraction of STAGE_TRANSITION_DURATION). */
export const ROLE_TRANSITION_DELAY: Record<BranchRole, number> = {
  trunk: 0,
  primary: 0.18,
  secondary: 0.40,
  aspiration: 0.28,
};

/** Branch length scale per breakpoint (stages define 100 % = desktop). */
export const LENGTH_SCALE: Record<BreakpointMode, number> = {
  desktop: 1.0,
  tablet: 0.65,
  mobile: 0.4,
};

/** Ghost base-stroke opacity factor = branch.opacity × this. */
export const BASE_STROKE_OPACITY = 0.08;

// ── Cluster Geometry ───────────────────────────────────

export interface ClusterConfig {
  radius: number;
  maxSegs: number;
  segLenMin: number;
  segLenMax: number;
  breatheAmount: number;
  lineWidth: number;
}

export const CLUSTER_CONFIGS: Record<BreakpointMode, ClusterConfig> = {
  desktop: {
    radius: 18,
    maxSegs: 6,
    segLenMin: 4,
    segLenMax: 8,
    breatheAmount: 1.0,
    lineWidth: 0.9,
  },
  tablet: {
    radius: 12,
    maxSegs: 4,
    segLenMin: 3,
    segLenMax: 6,
    breatheAmount: 0.6,
    lineWidth: 0.8,
  },
  mobile: {
    radius: 8,
    maxSegs: 3,
    segLenMin: 2,
    segLenMax: 4,
    breatheAmount: 0,
    lineWidth: 0.7,
  },
};

export const CLUSTER_BREATHE_MIN = 4;
export const CLUSTER_BREATHE_MAX = 6;

// ── Signal Constants ───────────────────────────────────

export const SIGNAL_RADIUS = 1.8;
export const SIGNAL_GLOW_RADIUS = 5;
export const SIGNAL_FLASH_DURATION = 0.25;
export const SIGNAL_FLASH_BOOST = 0.25;

// ── Growth & Timing ────────────────────────────────────

export const FADE_IN_DURATION = 1.8;
export const GROWTH_DURATION = 2.0;
export const CLUSTER_APPEAR_THRESHOLD = 0.82;
export const SIGNAL_READY_THRESHOLD = 0.88;

// ── Global Opacity ─────────────────────────────────────

export const MOBILE_GLOBAL_OPACITY = 0.55;
