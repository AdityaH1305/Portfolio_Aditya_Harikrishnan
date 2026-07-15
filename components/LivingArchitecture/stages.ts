/* ══════════════════════════════════════════════════════
   Living Architecture — Stage Definitions
   Phase 3: Large-scale right-weighted choreography

   Each stage is a target configuration the engine
   interpolates toward when the corresponding section
   enters the viewport.

   Stage index maps to SideNav sections:
     0  intro     Dormant core, incomplete trunk
     1  work      Trunk establishes, primaries activate
     2  projects  Visual peak — broad network blooms
     3  research  Refinement — weak paths fade, key routes sharpen
     4  journey   Stable maturity + upward aspiration branch
     5  contact   Full canopy / equilibrium — spacious and complete
   ══════════════════════════════════════════════════════ */

import { type BranchDef } from "./config";

// ── Section → stage mapping ────────────────────────────

export const SECTION_IDS = [
  "intro",
  "work",
  "projects",
  "research",
  "journey",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

// ── Stage transition timing ────────────────────────────

/** Seconds for the system to interpolate from current → target stage.
 *  This is the central timing source for all role-based delays. */
export const STAGE_TRANSITION_DURATION = 2.2;

// ── Per-stage config interface ─────────────────────────

export interface StageConfig {
  /** Core segment opacity target. */
  coreOpacity: number;
  /** Core glow radius multiplier (1 = baseline). */
  coreGlowScale: number;
  /** Core breathe period in seconds. */
  coreBreathePeriod: number;
  /** Branch definitions active at this stage. */
  branches: BranchDef[];
  /** Cluster segment density range [min, max]. */
  clusterSegRange: [number, number];
  /** Cluster base opacity. */
  clusterOpacity: number;
  /** Max concurrent signals (before breakpoint cap). */
  signalMax: number;
  /** Signal spawn interval range [min, max] in seconds. */
  signalSpawnRange: [number, number];
  /** Signal speed range [min, max] in px/s. */
  signalSpeedRange: [number, number];
  /** Cross-branch conduit count (before breakpoint cap). */
  conduitCount: number;
  /** System-wide opacity pulse amplitude (0 = none). */
  systemPulseAmplitude: number;
  /** Per-branch opacity overrides, keyed by branch id. */
  branchOpacityOverrides: Record<string, number>;
}

// ── Branch templates ───────────────────────────────────
// These define the *canonical* identity of each branch.
// Stages reference them with spread overrides for length/opacity/width.
// The `id`, `role`, `seed`, `baseAngle`, `segmentCount`, and
// `angleVariance` are STABLE across all stages.

const TRUNK: BranchDef = {
  id: "trunk",
  role: "trunk",
  baseAngle: Math.PI / 2 - 0.15,
  length: 280,
  segmentCount: 12,
  angleVariance: 0.055,
  opacity: 0.14,
  width: 1.1,
  seed: 42,
};

const PRIMARY_EAST: BranchDef = {
  id: "primary-east",
  role: "primary",
  baseAngle: 0.52,
  length: 240,
  segmentCount: 10,
  angleVariance: 0.07,
  opacity: 0.12,
  width: 0.85,
  seed: 137,
};

const PRIMARY_WEST: BranchDef = {
  id: "primary-west",
  role: "primary",
  baseAngle: Math.PI / 2 + 0.55,
  length: 200,
  segmentCount: 9,
  angleVariance: 0.065,
  opacity: 0.1,
  width: 0.8,
  seed: 256,
};

const SECONDARY_SE: BranchDef = {
  id: "secondary-se",
  role: "secondary",
  baseAngle: Math.PI / 2 - 0.65,
  length: 180,
  segmentCount: 8,
  angleVariance: 0.07,
  opacity: 0.08,
  width: 0.7,
  seed: 389,
};

const SECONDARY_DEPTH: BranchDef = {
  id: "secondary-depth",
  role: "secondary",
  baseAngle: Math.PI / 2 + 0.18,
  length: 160,
  segmentCount: 7,
  angleVariance: 0.06,
  opacity: 0.07,
  width: 0.65,
  seed: 512,
};

const SECONDARY_WIDE: BranchDef = {
  id: "secondary-wide",
  role: "secondary",
  baseAngle: 0.12,
  length: 150,
  segmentCount: 7,
  angleVariance: 0.065,
  opacity: 0.06,
  width: 0.6,
  seed: 617,
};

const SECONDARY_LATERAL: BranchDef = {
  id: "secondary-lateral",
  role: "secondary",
  baseAngle: Math.PI / 2 - 0.9,
  length: 140,
  segmentCount: 6,
  angleVariance: 0.06,
  opacity: 0.055,
  width: 0.55,
  seed: 743,
};

const SECONDARY_REACH: BranchDef = {
  id: "secondary-reach",
  role: "secondary",
  baseAngle: Math.PI / 2 + 0.85,
  length: 130,
  segmentCount: 6,
  angleVariance: 0.055,
  opacity: 0.05,
  width: 0.55,
  seed: 829,
};

const ASPIRATION: BranchDef = {
  id: "aspiration",
  role: "aspiration",
  baseAngle: -Math.PI / 2 + 0.22,
  length: 190,
  segmentCount: 8,
  angleVariance: 0.05,
  opacity: 0.09,
  width: 0.7,
  seed: 881,
};

// ── Stage definitions ──────────────────────────────────

export const STAGES: StageConfig[] = [
  /* ── Stage 0: Dormant Core (intro) ──────────────────
     A large core with a slow halo, an incomplete trunk,
     and two barely-visible ghost stubs. Quiet but
     unmistakably present.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.55,
    coreGlowScale: 1.0,
    coreBreathePeriod: 4.0,
    branches: [
      { ...TRUNK, length: 120, opacity: 0.06 },
      { ...PRIMARY_EAST, length: 55, opacity: 0.022 },
      { ...PRIMARY_WEST, length: 45, opacity: 0.018 },
    ],
    clusterSegRange: [1, 2],
    clusterOpacity: 0.12,
    signalMax: 0,
    signalSpawnRange: [5.0, 8.0],
    signalSpeedRange: [20, 35],
    conduitCount: 0,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 1: Trunk Establishes (work) ──────────────
     The trunk reaches full structure. Primary branches
     activate and carry occasional signals.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.65,
    coreGlowScale: 1.25,
    coreBreathePeriod: 3.5,
    branches: [
      { ...TRUNK, length: 220, opacity: 0.1 },
      { ...PRIMARY_EAST, length: 160, opacity: 0.08 },
      { ...PRIMARY_WEST, length: 140, opacity: 0.07 },
      { ...SECONDARY_SE, length: 60, opacity: 0.03 },
    ],
    clusterSegRange: [2, 3],
    clusterOpacity: 0.2,
    signalMax: 3,
    signalSpawnRange: [2.0, 3.8],
    signalSpeedRange: [28, 55],
    conduitCount: 0,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 2: Visual Peak (projects) ────────────────
     A broad network blooms across the right side.
     Multiple branch families, dense clusters, cross-
     connections, and active signal traffic.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.72,
    coreGlowScale: 1.45,
    coreBreathePeriod: 2.8,
    branches: [
      { ...TRUNK, length: 280, opacity: 0.14 },
      { ...PRIMARY_EAST, length: 240, opacity: 0.12 },
      { ...PRIMARY_WEST, length: 200, opacity: 0.1 },
      { ...SECONDARY_SE, length: 180, opacity: 0.08 },
      { ...SECONDARY_DEPTH, length: 160, opacity: 0.07 },
      { ...SECONDARY_WIDE, length: 150, opacity: 0.06 },
      { ...SECONDARY_LATERAL, length: 140, opacity: 0.055 },
      { ...SECONDARY_REACH, length: 130, opacity: 0.05 },
    ],
    clusterSegRange: [4, 5],
    clusterOpacity: 0.35,
    signalMax: 8,
    signalSpawnRange: [1.0, 2.2],
    signalSpeedRange: [32, 65],
    conduitCount: 2,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 3: Refinement (research) ─────────────────
     Weak paths fade, key routes sharpen, and selected
     connections become more deliberate. The network
     tightens and clarifies.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.7,
    coreGlowScale: 1.2,
    coreBreathePeriod: 2.6,
    branches: [
      { ...TRUNK, length: 280, opacity: 0.16 },
      { ...PRIMARY_EAST, length: 240, opacity: 0.14 },
      { ...PRIMARY_WEST, length: 200, opacity: 0.11 },
      { ...SECONDARY_SE, length: 180, opacity: 0.04 },
      { ...SECONDARY_DEPTH, length: 160, opacity: 0.09 },
      { ...SECONDARY_WIDE, length: 150, opacity: 0.02 },
      { ...SECONDARY_LATERAL, length: 140, opacity: 0.02 },
      { ...SECONDARY_REACH, length: 130, opacity: 0.02 },
    ],
    clusterSegRange: [3, 4],
    clusterOpacity: 0.32,
    signalMax: 5,
    signalSpawnRange: [1.5, 2.8],
    signalSpeedRange: [35, 65],
    conduitCount: 3,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 4: Stable Maturity (journey) ─────────────
     The system stabilises. A distinct upward-reaching
     aspiration branch grows, suggesting direction.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.68,
    coreGlowScale: 1.3,
    coreBreathePeriod: 3.2,
    branches: [
      { ...TRUNK, length: 280, opacity: 0.13 },
      { ...PRIMARY_EAST, length: 240, opacity: 0.11 },
      { ...PRIMARY_WEST, length: 200, opacity: 0.09 },
      { ...SECONDARY_SE, length: 180, opacity: 0.035 },
      { ...SECONDARY_DEPTH, length: 160, opacity: 0.08 },
      { ...SECONDARY_WIDE, length: 150, opacity: 0.02 },
      { ...SECONDARY_LATERAL, length: 140, opacity: 0.02 },
      { ...ASPIRATION, length: 180, opacity: 0.09 },
    ],
    clusterSegRange: [3, 4],
    clusterOpacity: 0.28,
    signalMax: 5,
    signalSpawnRange: [1.8, 3.2],
    signalSpeedRange: [30, 55],
    conduitCount: 2,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 5: Full Equilibrium (contact) ────────────
     A spacious mature canopy frames the contact section.
     Gentle heartbeat pulse. Complete and calm.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.65,
    coreGlowScale: 1.35,
    coreBreathePeriod: 3.8,
    branches: [
      { ...TRUNK, length: 280, opacity: 0.12 },
      { ...PRIMARY_EAST, length: 240, opacity: 0.1 },
      { ...PRIMARY_WEST, length: 200, opacity: 0.09 },
      { ...SECONDARY_SE, length: 180, opacity: 0.04 },
      { ...SECONDARY_DEPTH, length: 160, opacity: 0.07 },
      { ...SECONDARY_WIDE, length: 150, opacity: 0.03 },
      { ...ASPIRATION, length: 190, opacity: 0.08 },
    ],
    clusterSegRange: [3, 4],
    clusterOpacity: 0.25,
    signalMax: 4,
    signalSpawnRange: [2.0, 3.5],
    signalSpeedRange: [28, 50],
    conduitCount: 2,
    systemPulseAmplitude: 0.02,
    branchOpacityOverrides: {},
  },
];
