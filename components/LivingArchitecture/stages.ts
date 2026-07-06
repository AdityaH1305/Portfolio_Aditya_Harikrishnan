/* ══════════════════════════════════════════════════════
   Living Architecture — Stage Definitions
   Phase 2: Section-aware evolution

   Each stage is a target configuration the engine
   interpolates toward when the corresponding section
   enters the viewport.

   Stage index maps to SideNav sections:
     0  intro     Dormant core
     1  work      Core awakens, branches extend
     2  projects  System expands significantly
     3  research  Architecture reorganizes
     4  journey   Stable maturity
     5  contact   Full equilibrium
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

/** Seconds for the system to interpolate from current → target stage. */
export const STAGE_TRANSITION_DURATION = 2.2;

// ── Per-stage overrides ────────────────────────────────
// Only properties that CHANGE from the baseline are listed.
// The engine merges these on top of Phase 1 defaults.

export interface StageConfig {
  /** Core segment opacity target. */
  coreOpacity: number;
  /** Core glow radius multiplier (1 = default). */
  coreGlowScale: number;
  /** Core breathe period in seconds. */
  coreBreathePeriod: number;
  /** Branch definitions for this stage. */
  branches: BranchDef[];
  /** Cluster segment count range [min, max]. */
  clusterSegRange: [number, number];
  /** Cluster base opacity. */
  clusterOpacity: number;
  /** Max concurrent signals. */
  signalMax: number;
  /** Signal spawn interval range [min, max] in seconds. */
  signalSpawnRange: [number, number];
  /** Signal speed range [min, max] in px/s. */
  signalSpeedRange: [number, number];
  /** Cross-branch conduit count (connections between branch tips). */
  conduitCount: number;
  /** Overall system opacity pulse amplitude (0 = none). */
  systemPulseAmplitude: number;
  /** Per-branch opacity overrides (indexed by branch order). */
  branchOpacityOverrides: Record<number, number>;
}

// ── Helper: Phase 1 baseline branches ──────────────────

const B0_PRIMARY: BranchDef = {
  baseAngle: Math.PI / 2 - 0.44,
  length: 60,
  segmentCount: 8,
  angleVariance: 0.09,
  opacity: 0.09,
  width: 0.75,
  seed: 42,
};

const B1_SECONDARY: BranchDef = {
  baseAngle: Math.PI / 2 + 0.35,
  length: 45,
  segmentCount: 6,
  angleVariance: 0.07,
  opacity: 0.065,
  width: 0.65,
  seed: 137,
};

const B2_TERTIARY: BranchDef = {
  baseAngle: Math.PI / 2 - 0.12,
  length: 35,
  segmentCount: 5,
  angleVariance: 0.06,
  opacity: 0.05,
  width: 0.6,
  seed: 256,
};

// ── Extended branches (introduced at higher stages) ────

const B3_REACH: BranchDef = {
  baseAngle: Math.PI / 2 + 0.65,
  length: 30,
  segmentCount: 5,
  angleVariance: 0.07,
  opacity: 0.055,
  width: 0.6,
  seed: 389,
};

const B4_DEPTH: BranchDef = {
  baseAngle: Math.PI / 2 - 0.7,
  length: 50,
  segmentCount: 7,
  angleVariance: 0.08,
  opacity: 0.07,
  width: 0.7,
  seed: 512,
};

const B5_LATERAL: BranchDef = {
  baseAngle: Math.PI / 2 + 0.9,
  length: 38,
  segmentCount: 5,
  angleVariance: 0.06,
  opacity: 0.045,
  width: 0.55,
  seed: 617,
};

const B6_SPAN: BranchDef = {
  baseAngle: Math.PI / 2 - 0.85,
  length: 42,
  segmentCount: 6,
  angleVariance: 0.07,
  opacity: 0.05,
  width: 0.6,
  seed: 743,
};

/** The single upward-growing branch at the Journey stage. */
const B7_ASPIRATION: BranchDef = {
  baseAngle: -Math.PI / 2 + 0.2,
  length: 25,
  segmentCount: 4,
  angleVariance: 0.05,
  opacity: 0.06,
  width: 0.55,
  seed: 881,
};

// ── Stage definitions ──────────────────────────────────

export const STAGES: StageConfig[] = [
  /* ── Stage 0: Dormant Core (intro) ──────────────────
     Phase 1 resting state. Quiet, expectant.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.5,
    coreGlowScale: 1.0,
    coreBreathePeriod: 3.5,
    branches: [B0_PRIMARY, B1_SECONDARY, B2_TERTIARY],
    clusterSegRange: [2, 3],
    clusterOpacity: 0.25,
    signalMax: 3,
    signalSpawnRange: [2.5, 4.5],
    signalSpeedRange: [25, 50],
    conduitCount: 0,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 1: Core Awakens (work / Ludex) ───────────
     First evidence of capability. Core brightens.
     Existing branches extend. A new branch emerges.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.65,
    coreGlowScale: 1.25,
    coreBreathePeriod: 3.2,
    branches: [
      { ...B0_PRIMARY, length: 78, opacity: 0.11 },
      { ...B1_SECONDARY, length: 58, opacity: 0.08 },
      { ...B2_TERTIARY, length: 45, opacity: 0.065 },
      B3_REACH,
    ],
    clusterSegRange: [2, 4],
    clusterOpacity: 0.3,
    signalMax: 4,
    signalSpawnRange: [2.0, 3.8],
    signalSpeedRange: [28, 55],
    conduitCount: 0,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 2: System Expands (projects) ─────────────
     Breadth of work revealed. Multiple new subsystems.
     Signal density increases. First cross-connections.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.7,
    coreGlowScale: 1.4,
    coreBreathePeriod: 3.0,
    branches: [
      { ...B0_PRIMARY, length: 90, opacity: 0.12 },
      { ...B1_SECONDARY, length: 65, opacity: 0.09 },
      { ...B2_TERTIARY, length: 52, opacity: 0.075 },
      { ...B3_REACH, length: 42, opacity: 0.07 },
      B4_DEPTH,
      B5_LATERAL,
      B6_SPAN,
    ],
    clusterSegRange: [3, 4],
    clusterOpacity: 0.32,
    signalMax: 6,
    signalSpawnRange: [1.2, 2.5],
    signalSpeedRange: [30, 60],
    conduitCount: 1,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {},
  },

  /* ── Stage 3: Architecture Reorganizes (research) ───
     Refinement, not addition. Weak branches fade.
     Strong pathways intensify. System tightens.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.72,
    coreGlowScale: 1.2,
    coreBreathePeriod: 2.8,
    branches: [
      { ...B0_PRIMARY, length: 90, opacity: 0.14 },
      { ...B1_SECONDARY, length: 65, opacity: 0.10 },
      { ...B2_TERTIARY, length: 52, opacity: 0.08 },
      { ...B3_REACH, length: 42, opacity: 0.03 },
      { ...B4_DEPTH, length: 50, opacity: 0.09 },
      { ...B5_LATERAL, length: 38, opacity: 0.02 },
      B6_SPAN,
    ],
    clusterSegRange: [3, 4],
    clusterOpacity: 0.35,
    signalMax: 5,
    signalSpawnRange: [1.5, 2.8],
    signalSpeedRange: [35, 65],
    conduitCount: 2,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {
      3: 0.03,
      5: 0.02,
    },
  },

  /* ── Stage 4: Stable Maturity (journey) ─────────────
     Warmth returns. A single upward branch grows.
     Everything settles to stable mid-range values.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.68,
    coreGlowScale: 1.3,
    coreBreathePeriod: 3.4,
    branches: [
      { ...B0_PRIMARY, length: 90, opacity: 0.12 },
      { ...B1_SECONDARY, length: 65, opacity: 0.09 },
      { ...B2_TERTIARY, length: 52, opacity: 0.07 },
      { ...B3_REACH, length: 42, opacity: 0.03 },
      { ...B4_DEPTH, length: 50, opacity: 0.08 },
      { ...B5_LATERAL, length: 38, opacity: 0.02 },
      { ...B6_SPAN, opacity: 0.045 },
      B7_ASPIRATION,
    ],
    clusterSegRange: [3, 4],
    clusterOpacity: 0.3,
    signalMax: 5,
    signalSpawnRange: [1.8, 3.2],
    signalSpeedRange: [30, 55],
    conduitCount: 2,
    systemPulseAmplitude: 0,
    branchOpacityOverrides: {
      3: 0.03,
      5: 0.02,
    },
  },

  /* ── Stage 5: Full Equilibrium (contact) ────────────
     System is complete. Gentle heartbeat pulse.
     No new growth — ready and confident.
     ─────────────────────────────────────────────────── */
  {
    coreOpacity: 0.68,
    coreGlowScale: 1.3,
    coreBreathePeriod: 3.6,
    branches: [
      { ...B0_PRIMARY, length: 90, opacity: 0.12 },
      { ...B1_SECONDARY, length: 65, opacity: 0.09 },
      { ...B2_TERTIARY, length: 52, opacity: 0.07 },
      { ...B3_REACH, length: 42, opacity: 0.03 },
      { ...B4_DEPTH, length: 50, opacity: 0.08 },
      { ...B5_LATERAL, length: 38, opacity: 0.02 },
      { ...B6_SPAN, opacity: 0.045 },
      { ...B7_ASPIRATION, opacity: 0.06 },
    ],
    clusterSegRange: [3, 4],
    clusterOpacity: 0.3,
    signalMax: 5,
    signalSpawnRange: [1.8, 3.2],
    signalSpeedRange: [30, 55],
    conduitCount: 2,
    systemPulseAmplitude: 0.02,
    branchOpacityOverrides: {
      3: 0.03,
      5: 0.02,
    },
  },
];
