/* ══════════════════════════════════════════════════════
   Living Architecture — Canvas 2D Engine
   Phase 2: Section‑aware evolution

   Pure imperative JS. Zero React state in the render
   loop. All animation values live in plain objects
   updated via requestAnimationFrame with delta‑time.

   Phase 2 additions:
   - Stage system: each portfolio section maps to a
     target configuration (core opacity, branch count,
     signal density, conduits, etc.)
   - Smooth interpolation between stages (~2.2 s)
   - Cross‑branch conduits (faint connections between
     branch tips)
   - System‑wide heartbeat pulse at equilibrium
   - Reversible: scrolling upward regresses the system

   Draw order (back → front):
     1. Core radial glow
     2. Conduits (behind branches)
     3. Branches
     4. Core segments (glow pass, then sharp pass)
     5. Clusters  (glow pass, then sharp pass)
     6. Signals   (glow halo, then bright dot)
   ══════════════════════════════════════════════════════ */

import {
  gold,
  DPR_CAP,
  COMPACT_THRESHOLD,
  CORE_SEGMENTS,
  CORE_SEGMENTS_COMPACT,
  CORE_SEG_LEN_MIN,
  CORE_SEG_LEN_MAX,
  CORE_SEG_LEN_MIN_COMPACT,
  CORE_SEG_LEN_MAX_COMPACT,
  CORE_BREATHE_AMOUNT,
  CORE_LINE_WIDTH,
  CORE_GLOW_RADIUS,
  CORE_GLOW_RADIUS_COMPACT,
  CORE_GLOW_OPACITY,
  DESKTOP_CORE_Y,
  COMPACT_CORE_Y,
  BRANCH_DEFS_COMPACT,
  BRANCH_START_OFFSET,
  BRANCH_START_OFFSET_COMPACT,
  CLUSTER_SEG_LEN_MIN,
  CLUSTER_SEG_LEN_MAX,
  CLUSTER_RADIUS,
  CLUSTER_RADIUS_COMPACT,
  CLUSTER_BREATHE_MIN,
  CLUSTER_BREATHE_MAX,
  CLUSTER_BREATHE_AMOUNT,
  CLUSTER_LINE_WIDTH,
  SIGNAL_MAX_COMPACT,
  SIGNAL_RADIUS,
  SIGNAL_GLOW_RADIUS,
  SIGNAL_FLASH_DURATION,
  SIGNAL_FLASH_BOOST,
  FADE_IN_DURATION,
  GROWTH_DURATION,
  GROWTH_DELAYS,
  GROWTH_DELAYS_COMPACT,
  CLUSTER_APPEAR_THRESHOLD,
  SIGNAL_READY_THRESHOLD,
  COMPACT_GLOBAL_OPACITY,
  type BranchDef,
} from "./config";

import {
  STAGES,
  STAGE_TRANSITION_DURATION,
  type StageConfig,
} from "./stages";

// ── Types ──────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

interface CoreSegment {
  angle: number;
  length: number;
  breathePhase: number;
}

interface CoreState {
  x: number;
  y: number;
  segments: CoreSegment[];
  opacity: number;
}

interface ClusterSegment {
  offsetX: number;
  offsetY: number;
  angle: number;
  length: number;
  breathePhase: number;
}

interface ClusterState {
  x: number;
  y: number;
  segments: ClusterSegment[];
  breatheRate: number;
  baseOpacity: number;
  flashTimer: number;
}

interface BranchState {
  points: Point[];
  segLengths: number[];
  totalLength: number;
  opacity: number;
  targetOpacity: number;
  width: number;
  clusterIndex: number;
  growthProgress: number;
  targetGrowth: number;
  growthDelay: number;
  growthDuration: number;
}

interface SignalState {
  branchIndex: number;
  distance: number;
  speed: number;
  opacity: number;
  alive: boolean;
}

interface ConduitState {
  fromBranch: number;
  toBranch: number;
  opacity: number;
  targetOpacity: number;
}

// ── Animated scalars (smooth interpolation) ────────────

interface AnimatedValue {
  current: number;
  target: number;
}

function lerpAnimated(v: AnimatedValue, speed: number, dt: number): void {
  v.current += (v.target - v.current) * (1 - Math.pow(1 - speed, dt * 60));
}

// ── Seeded PRNG (mulberry32) ───────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Path generation ────────────────────────────────────

const TAU = Math.PI * 2;

function generateBranchPath(
  startX: number,
  startY: number,
  baseAngle: number,
  totalLength: number,
  segmentCount: number,
  angleVariance: number,
  rng: () => number,
): Point[] {
  const points: Point[] = [{ x: startX, y: startY }];
  let angle = baseAngle;

  for (let i = 0; i < segmentCount; i++) {
    const segLen = (totalLength / segmentCount) * (0.82 + rng() * 0.36);
    angle += (rng() - 0.5) * 2 * angleVariance;
    angle += (baseAngle - angle) * 0.12;
    const prev = points[points.length - 1];
    points.push({
      x: prev.x + Math.cos(angle) * segLen,
      y: prev.y + Math.sin(angle) * segLen,
    });
  }

  return points;
}

function computePathMetrics(
  points: Point[],
): { segLengths: number[]; totalLength: number } {
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }
  return { segLengths, totalLength };
}

// ── Engine ─────────────────────────────────────────────

export class LivingArchitectureEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private isCompact = false;
  private reducedMotion: boolean;

  // Master PRNG for core/cluster generation
  private rng: () => number = mulberry32(7919);

  // System state
  private core!: CoreState;
  private branches: BranchState[] = [];
  private clusters: ClusterState[] = [];
  private signals: SignalState[] = [];
  private conduits: ConduitState[] = [];

  // Animated properties (smoothly interpolated)
  private coreOpacity: AnimatedValue = { current: 0.5, target: 0.5 };
  private coreGlowScale: AnimatedValue = { current: 1, target: 1 };
  private coreBreathePeriod: AnimatedValue = { current: 3.5, target: 3.5 };
  private clusterOpacity: AnimatedValue = { current: 0.25, target: 0.25 };
  private systemPulseAmplitude: AnimatedValue = { current: 0, target: 0 };

  // Signal parameters (animated)
  private signalSpawnMin: AnimatedValue = { current: 2.5, target: 2.5 };
  private signalSpawnMax: AnimatedValue = { current: 4.5, target: 4.5 };
  private signalSpeedMin: AnimatedValue = { current: 25, target: 25 };
  private signalSpeedMax: AnimatedValue = { current: 50, target: 50 };

  // Stage management
  private currentStage = 0;
  private maxSignals = 3;

  // Timing
  private time = 0;
  private fadeInProgress = 0;
  private signalSpawnTimer = 0;

  // RAF
  private running = false;
  private lastTimestamp = 0;
  private rafId = 0;

  // Interpolation speed (frame-rate independent)
  // Lower = slower transition. 0.03 at 60fps ≈ 2.2s to 95% convergence.
  private readonly interpSpeed = 0.03;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    reducedMotion: boolean,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.reducedMotion = reducedMotion;
  }

  // ── Lifecycle ──────────────────────────────────────

  resize(cssWidth: number, cssHeight: number): void {
    if (cssWidth < 1 || cssHeight < 1) return;
    if (
      Math.abs(cssWidth - this.width) < 0.5 &&
      Math.abs(cssHeight - this.height) < 0.5
    ) {
      return;
    }

    this.width = cssWidth;
    this.height = cssHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    this.dpr = dpr;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.initSystem();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** Draw the system at its fully-grown resting state (for prefers-reduced-motion). */
  drawStatic(): void {
    for (const branch of this.branches) {
      branch.growthProgress = branch.targetGrowth;
      branch.opacity = branch.targetOpacity;
    }
    this.fadeInProgress = 1;
    this.coreOpacity.current = this.coreOpacity.target;
    this.coreGlowScale.current = this.coreGlowScale.target;
    this.coreBreathePeriod.current = this.coreBreathePeriod.target;
    this.clusterOpacity.current = this.clusterOpacity.target;
    this.systemPulseAmplitude.current = this.systemPulseAmplitude.target;
    for (const conduit of this.conduits) {
      conduit.opacity = conduit.targetOpacity;
    }
    this.time = 0;
    this.draw();
  }

  /** Transition to a new stage. Called by the React component
   *  when IntersectionObserver detects a section change. */
  setStage(stageIndex: number): void {
    if (stageIndex < 0 || stageIndex >= STAGES.length) return;
    if (stageIndex === this.currentStage) return;
    if (this.isCompact) return; // mobile stays at stage 0

    this.currentStage = stageIndex;
    this.applyStageTargets(STAGES[stageIndex]);
  }

  // ── Stage application ──────────────────────────────

  private applyStageTargets(stage: StageConfig): void {
    // Animated scalar targets
    this.coreOpacity.target = stage.coreOpacity;
    this.coreGlowScale.target = stage.coreGlowScale;
    this.coreBreathePeriod.target = stage.coreBreathePeriod;
    this.clusterOpacity.target = stage.clusterOpacity;
    this.systemPulseAmplitude.target = stage.systemPulseAmplitude;
    this.signalSpawnMin.target = stage.signalSpawnRange[0];
    this.signalSpawnMax.target = stage.signalSpawnRange[1];
    this.signalSpeedMin.target = stage.signalSpeedRange[0];
    this.signalSpeedMax.target = stage.signalSpeedRange[1];

    // Branch targets: grow new branches, set opacity targets
    this.reconcileBranches(stage.branches, stage.branchOpacityOverrides);

    // Signal pool: expand if needed (never shrink mid-animation)
    if (stage.signalMax > this.maxSignals) {
      for (let i = this.maxSignals; i < stage.signalMax; i++) {
        this.signals.push({
          branchIndex: 0,
          distance: 0,
          speed: 0,
          opacity: 0,
          alive: false,
        });
      }
      this.maxSignals = stage.signalMax;
    }

    // Conduits
    this.reconcileConduits(stage.conduitCount);
  }

  /**
   * Reconcile the branch array with a new set of branch definitions.
   * - Existing branches update their target opacity and growth.
   * - New branches are created with growthProgress=0 and animate in.
   * - Branches that no longer exist in the definition get faded out
   *   (targetOpacity → 0, then cleaned up when invisible).
   */
  private reconcileBranches(
    defs: BranchDef[],
    opacityOverrides: Record<number, number>,
  ): void {
    // Mark all existing branches for potential fade-out
    for (const branch of this.branches) {
      branch.targetOpacity = 0;
      branch.targetGrowth = 0;
    }

    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const overrideOpacity = opacityOverrides[i];
      const targetOpacity = overrideOpacity !== undefined ? overrideOpacity : def.opacity;

      if (i < this.branches.length) {
        // Existing branch: update targets
        const branch = this.branches[i];
        branch.targetOpacity = targetOpacity;
        branch.targetGrowth = 1;

        // If the branch definition changed geometry (length/segments),
        // regenerate the path but keep current growth progress
        if (this.branchNeedsRegeneration(branch, def)) {
          const saved = branch.growthProgress;
          const savedOpacity = branch.opacity;
          const newBranch = this.createBranch(def, i, [0]);
          newBranch.growthProgress = saved;
          newBranch.opacity = savedOpacity;
          newBranch.targetOpacity = targetOpacity;
          newBranch.targetGrowth = 1;
          newBranch.growthDelay = 0;
          this.branches[i] = newBranch;
        }
      } else {
        // New branch: create with zero growth, will animate in
        const newBranch = this.createBranch(def, i, [0]);
        newBranch.growthProgress = 0;
        newBranch.opacity = 0;
        newBranch.targetOpacity = targetOpacity;
        newBranch.targetGrowth = 1;
        newBranch.growthDelay = 0;
        newBranch.growthDuration = GROWTH_DURATION;
        this.branches.push(newBranch);
      }
    }
  }

  /** Check if a branch definition has changed enough to need path regeneration. */
  private branchNeedsRegeneration(branch: BranchState, def: BranchDef): boolean {
    // Compare the target total length with the current path's total length.
    // If they differ by more than 5px, regenerate.
    return Math.abs(branch.totalLength - def.length) > 5;
  }

  /** Reconcile conduits (cross-branch connections). */
  private reconcileConduits(targetCount: number): void {
    // Create deterministic conduit pairs based on branch count
    while (this.conduits.length < targetCount && this.branches.length >= 2) {
      const pairIndex = this.conduits.length;
      let fromIdx: number;
      let toIdx: number;

      if (pairIndex === 0) {
        // First conduit: connect branch 0 tip to branch 2 tip
        fromIdx = 0;
        toIdx = Math.min(2, this.branches.length - 1);
      } else {
        // Second conduit: connect branch 1 tip to branch 4 tip
        fromIdx = Math.min(1, this.branches.length - 1);
        toIdx = Math.min(4, this.branches.length - 1);
      }

      if (fromIdx !== toIdx) {
        this.conduits.push({
          fromBranch: fromIdx,
          toBranch: toIdx,
          opacity: 0,
          targetOpacity: 0.035,
        });
      }
    }

    // Fade out excess conduits
    for (let i = targetCount; i < this.conduits.length; i++) {
      this.conduits[i].targetOpacity = 0;
    }

    // Set target opacity for active conduits
    for (let i = 0; i < Math.min(targetCount, this.conduits.length); i++) {
      this.conduits[i].targetOpacity = 0.035;
    }
  }

  // ── System generation ──────────────────────────────

  private initSystem(): void {
    this.isCompact = this.width < COMPACT_THRESHOLD;
    this.rng = mulberry32(7919);
    this.time = 0;
    this.fadeInProgress = 0;

    this.clusters = [];
    this.conduits = [];
    this.core = this.createCore();

    if (this.isCompact) {
      // Compact mode: single branch, no evolution
      const defs = BRANCH_DEFS_COMPACT;
      const delays = GROWTH_DELAYS_COMPACT;
      this.branches = defs.map((def, i) => this.createBranch(def, i, delays));
      this.maxSignals = SIGNAL_MAX_COMPACT;
      this.signals = [];
      for (let i = 0; i < this.maxSignals; i++) {
        this.signals.push({
          branchIndex: 0,
          distance: 0,
          speed: 0,
          opacity: 0,
          alive: false,
        });
      }
      this.signalSpawnTimer = 4.5;
      return;
    }

    // Desktop: init at stage 0, apply stage config
    this.currentStage = 0;
    const stage = STAGES[0];

    this.coreOpacity = { current: stage.coreOpacity, target: stage.coreOpacity };
    this.coreGlowScale = { current: stage.coreGlowScale, target: stage.coreGlowScale };
    this.coreBreathePeriod = { current: stage.coreBreathePeriod, target: stage.coreBreathePeriod };
    this.clusterOpacity = { current: stage.clusterOpacity, target: stage.clusterOpacity };
    this.systemPulseAmplitude = { current: 0, target: 0 };
    this.signalSpawnMin = { current: stage.signalSpawnRange[0], target: stage.signalSpawnRange[0] };
    this.signalSpawnMax = { current: stage.signalSpawnRange[1], target: stage.signalSpawnRange[1] };
    this.signalSpeedMin = { current: stage.signalSpeedRange[0], target: stage.signalSpeedRange[0] };
    this.signalSpeedMax = { current: stage.signalSpeedRange[1], target: stage.signalSpeedRange[1] };

    const defs = stage.branches;
    const delays = GROWTH_DELAYS;
    this.branches = defs.map((def, i) => {
      const branch = this.createBranch(def, i, delays);
      branch.targetOpacity = def.opacity;
      branch.targetGrowth = 1;
      return branch;
    });

    this.maxSignals = stage.signalMax;
    this.signals = [];
    for (let i = 0; i < this.maxSignals; i++) {
      this.signals.push({
        branchIndex: 0,
        distance: 0,
        speed: 0,
        opacity: 0,
        alive: false,
      });
    }

    this.signalSpawnTimer = stage.signalSpawnRange[1];
  }

  private createCore(): CoreState {
    const cx = this.width * 0.5;
    const cy = this.height * (this.isCompact ? COMPACT_CORE_Y : DESKTOP_CORE_Y);
    const count = this.isCompact ? CORE_SEGMENTS_COMPACT : CORE_SEGMENTS;
    const minLen = this.isCompact ? CORE_SEG_LEN_MIN_COMPACT : CORE_SEG_LEN_MIN;
    const maxLen = this.isCompact ? CORE_SEG_LEN_MAX_COMPACT : CORE_SEG_LEN_MAX;

    const segments: CoreSegment[] = [];
    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI;
      segments.push({
        angle: baseAngle + (this.rng() - 0.5) * 0.7,
        length: minLen + this.rng() * (maxLen - minLen),
        breathePhase: this.rng() * TAU,
      });
    }

    return { x: cx, y: cy, segments, opacity: 0.5 };
  }

  private createBranch(
    def: BranchDef,
    index: number,
    delays: number[],
  ): BranchState {
    const branchRng = mulberry32(def.seed);
    const offset = this.isCompact
      ? BRANCH_START_OFFSET_COMPACT
      : BRANCH_START_OFFSET;
    const startX = this.core.x + Math.cos(def.baseAngle) * offset;
    const startY = this.core.y + Math.sin(def.baseAngle) * offset;

    const points = generateBranchPath(
      startX,
      startY,
      def.baseAngle,
      def.length,
      def.segmentCount,
      def.angleVariance,
      branchRng,
    );

    const { segLengths, totalLength } = computePathMetrics(points);

    // Terminal cluster at the path's end
    const endPt = points[points.length - 1];
    const clusterSegCount = 2 + Math.floor(this.rng() * 2);
    const clusterR = this.isCompact ? CLUSTER_RADIUS_COMPACT : CLUSTER_RADIUS;
    const cluster = this.createCluster(endPt.x, endPt.y, clusterSegCount, clusterR);
    const clusterIndex = this.clusters.length;
    this.clusters.push(cluster);

    return {
      points,
      segLengths,
      totalLength,
      opacity: def.opacity,
      targetOpacity: def.opacity,
      width: def.width,
      clusterIndex,
      growthProgress: 0,
      targetGrowth: 1,
      growthDelay: delays[index] ?? 0.5,
      growthDuration: GROWTH_DURATION,
    };
  }

  private createCluster(
    x: number,
    y: number,
    segCount: number,
    radius: number,
  ): ClusterState {
    const segments: ClusterSegment[] = [];
    for (let i = 0; i < segCount; i++) {
      const a = this.rng() * TAU;
      const d = this.rng() * radius;
      segments.push({
        offsetX: Math.cos(a) * d,
        offsetY: Math.sin(a) * d,
        angle: this.rng() * Math.PI,
        length:
          CLUSTER_SEG_LEN_MIN +
          this.rng() * (CLUSTER_SEG_LEN_MAX - CLUSTER_SEG_LEN_MIN),
        breathePhase: this.rng() * TAU,
      });
    }

    return {
      x,
      y,
      segments,
      breatheRate:
        CLUSTER_BREATHE_MIN +
        this.rng() * (CLUSTER_BREATHE_MAX - CLUSTER_BREATHE_MIN),
      baseOpacity: 0.25,
      flashTimer: 0,
    };
  }

  // ── Animation loop ─────────────────────────────────

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.draw();

    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    this.time += dt;

    // Global fade-in
    if (this.time < FADE_IN_DURATION) {
      const t = this.time / FADE_IN_DURATION;
      this.fadeInProgress = 1 - Math.pow(1 - t, 3);
    } else {
      this.fadeInProgress = 1;
    }

    if (this.isCompact) {
      // Compact mode: simple Phase 1 behavior
      this.updateCompact(dt);
      return;
    }

    // Interpolate animated values toward targets
    const spd = this.interpSpeed;
    lerpAnimated(this.coreOpacity, spd, dt);
    lerpAnimated(this.coreGlowScale, spd, dt);
    lerpAnimated(this.coreBreathePeriod, spd, dt);
    lerpAnimated(this.clusterOpacity, spd, dt);
    lerpAnimated(this.systemPulseAmplitude, spd, dt);
    lerpAnimated(this.signalSpawnMin, spd, dt);
    lerpAnimated(this.signalSpawnMax, spd, dt);
    lerpAnimated(this.signalSpeedMin, spd, dt);
    lerpAnimated(this.signalSpeedMax, spd, dt);

    // Branch growth and opacity interpolation
    for (const branch of this.branches) {
      // Growth
      if (this.time < branch.growthDelay) continue;
      if (branch.growthProgress < branch.targetGrowth) {
        const elapsed = this.time - branch.growthDelay;
        const t = Math.min(1, elapsed / branch.growthDuration);
        const eased = 1 - Math.pow(1 - t, 3);
        branch.growthProgress = Math.max(
          branch.growthProgress,
          eased * branch.targetGrowth,
        );
      } else if (branch.targetGrowth < branch.growthProgress) {
        // Shrinking (scrolling back up): smooth approach
        branch.growthProgress += (branch.targetGrowth - branch.growthProgress) * spd * dt * 60;
      }

      // Opacity
      branch.opacity += (branch.targetOpacity - branch.opacity) * spd * dt * 60;
    }

    // Conduit opacity interpolation
    for (const conduit of this.conduits) {
      conduit.opacity += (conduit.targetOpacity - conduit.opacity) * spd * dt * 60;
    }

    // Signals
    this.updateSignals(dt);
  }

  /** Compact mode update (Phase 1 behavior only). */
  private updateCompact(dt: number): void {
    for (const branch of this.branches) {
      if (this.time < branch.growthDelay) continue;
      const elapsed = this.time - branch.growthDelay;
      const t = Math.min(1, elapsed / branch.growthDuration);
      branch.growthProgress = 1 - Math.pow(1 - t, 3);
    }
    this.updateSignals(dt);
  }

  private updateSignals(dt: number): void {
    const allReady = this.branches.some(
      (b) => b.growthProgress > SIGNAL_READY_THRESHOLD && b.opacity > 0.01,
    );

    // Move existing signals
    for (const sig of this.signals) {
      if (!sig.alive) continue;
      sig.distance += sig.speed * dt;

      const branch = this.branches[sig.branchIndex];
      if (!branch || branch.opacity < 0.005) {
        sig.alive = false;
        continue;
      }
      const visibleLen = branch.totalLength * branch.growthProgress;
      if (sig.distance >= visibleLen) {
        sig.alive = false;
        const cluster = this.clusters[branch.clusterIndex];
        if (cluster && branch.growthProgress > 0.95) {
          cluster.flashTimer = SIGNAL_FLASH_DURATION;
        }
      }
    }

    // Update cluster flash timers
    for (const cluster of this.clusters) {
      if (cluster.flashTimer > 0) {
        cluster.flashTimer = Math.max(0, cluster.flashTimer - dt);
      }
    }

    // Spawn
    if (allReady) {
      this.signalSpawnTimer -= dt;
      if (this.signalSpawnTimer <= 0) {
        this.spawnSignal();
        const spawnMin = this.isCompact ? 2.5 : this.signalSpawnMin.current;
        const spawnMax = this.isCompact ? 4.5 : this.signalSpawnMax.current;
        this.signalSpawnTimer = spawnMin + this.rng() * (spawnMax - spawnMin);
      }
    }
  }

  private spawnSignal(): void {
    const slot = this.signals.find((s) => !s.alive);
    if (!slot) return;

    // Pick a visible branch (opacity > 0.01, growth > 0.5)
    const viableBranches: number[] = [];
    for (let i = 0; i < this.branches.length; i++) {
      const b = this.branches[i];
      if (b.opacity > 0.01 && b.growthProgress > 0.5) {
        viableBranches.push(i);
      }
    }
    if (viableBranches.length === 0) return;

    const branchIdx = viableBranches[
      Math.floor(this.rng() * viableBranches.length)
    ];

    const speedMin = this.isCompact ? 25 : this.signalSpeedMin.current;
    const speedMax = this.isCompact ? 50 : this.signalSpeedMax.current;

    slot.branchIndex = branchIdx;
    slot.distance = 0;
    slot.speed = speedMin + this.rng() * (speedMax - speedMin);
    slot.opacity = 0.3 + this.rng() * 0.15;
    slot.alive = true;
  }

  // ── Drawing ────────────────────────────────────────

  private draw(): void {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    let globalAlpha =
      this.fadeInProgress * (this.isCompact ? COMPACT_GLOBAL_OPACITY : 1);

    // System heartbeat pulse (Stage 5)
    if (!this.isCompact && this.systemPulseAmplitude.current > 0.001) {
      const pulse = Math.sin(this.time * TAU / 4.0) * this.systemPulseAmplitude.current;
      globalAlpha *= (1 + pulse);
    }

    if (globalAlpha < 0.001) return;
    ctx.globalAlpha = globalAlpha;

    this.drawCoreGlow();
    this.drawConduits();

    for (const branch of this.branches) {
      if (branch.growthProgress > 0.01 && branch.opacity > 0.003) {
        this.drawBranch(branch);
      }
    }

    this.drawCoreSegments();

    for (const branch of this.branches) {
      if (
        branch.growthProgress > CLUSTER_APPEAR_THRESHOLD &&
        branch.opacity > 0.003
      ) {
        const cluster = this.clusters[branch.clusterIndex];
        if (cluster) {
          const growthAlpha = Math.min(
            1,
            (branch.growthProgress - CLUSTER_APPEAR_THRESHOLD) /
              (1 - CLUSTER_APPEAR_THRESHOLD),
          );
          // Cluster opacity is driven by animated clusterOpacity target
          const opacityFactor = this.isCompact ? 1 : (this.clusterOpacity.current / 0.25);
          this.drawCluster(cluster, growthAlpha * opacityFactor);
        }
      }
    }

    for (const sig of this.signals) {
      if (sig.alive) {
        this.drawSignal(sig);
      }
    }

    ctx.globalAlpha = 1;
  }

  private drawCoreGlow(): void {
    const { ctx, core, isCompact } = this;
    const baseR = isCompact ? CORE_GLOW_RADIUS_COMPACT : CORE_GLOW_RADIUS;
    const r = baseR * (isCompact ? 1 : this.coreGlowScale.current);
    const opacity = isCompact ? CORE_GLOW_OPACITY : CORE_GLOW_OPACITY * this.coreGlowScale.current;
    const grad = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, r);
    grad.addColorStop(0, gold(opacity));
    grad.addColorStop(0.6, gold(opacity * 0.4));
    grad.addColorStop(1, gold(0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(core.x, core.y, r, 0, TAU);
    ctx.fill();
  }

  private drawCoreSegments(): void {
    const { ctx, core, time, isCompact } = this;
    ctx.lineCap = "round";

    const breathePeriod = isCompact ? 3.5 : this.coreBreathePeriod.current;
    const coreOp = isCompact ? 0.5 : this.coreOpacity.current;

    for (let pass = 0; pass < 2; pass++) {
      const isGlow = pass === 0;
      for (const seg of core.segments) {
        const breathe = Math.sin(
          (TAU * time) / breathePeriod + seg.breathePhase,
        );
        const len = seg.length + breathe * CORE_BREATHE_AMOUNT;
        const half = len / 2;
        const x1 = core.x + Math.cos(seg.angle) * half;
        const y1 = core.y + Math.sin(seg.angle) * half;
        const x2 = core.x - Math.cos(seg.angle) * half;
        const y2 = core.y - Math.sin(seg.angle) * half;

        ctx.lineWidth = isGlow ? CORE_LINE_WIDTH + 2 : CORE_LINE_WIDTH;
        ctx.strokeStyle = gold(isGlow ? coreOp * 0.15 : coreOp);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  private drawBranch(branch: BranchState): void {
    const { ctx } = this;
    const visibleLen = branch.totalLength * branch.growthProgress;
    if (visibleLen < 0.5) return;

    ctx.lineWidth = branch.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = gold(branch.opacity);

    ctx.beginPath();
    ctx.moveTo(branch.points[0].x, branch.points[0].y);

    let drawn = 0;
    for (let i = 0; i < branch.segLengths.length; i++) {
      const next = drawn + branch.segLengths[i];
      if (next <= visibleLen) {
        ctx.lineTo(branch.points[i + 1].x, branch.points[i + 1].y);
        drawn = next;
      } else {
        const remaining = visibleLen - drawn;
        const t = remaining / branch.segLengths[i];
        const x =
          branch.points[i].x +
          (branch.points[i + 1].x - branch.points[i].x) * t;
        const y =
          branch.points[i].y +
          (branch.points[i + 1].y - branch.points[i].y) * t;
        ctx.lineTo(x, y);
        break;
      }
    }

    ctx.stroke();
  }

  /** Draw cross-branch conduits as faint curved lines. */
  private drawConduits(): void {
    const { ctx } = this;
    ctx.lineCap = "round";

    for (const conduit of this.conduits) {
      if (conduit.opacity < 0.002) continue;

      const fromBranch = this.branches[conduit.fromBranch];
      const toBranch = this.branches[conduit.toBranch];
      if (!fromBranch || !toBranch) continue;
      if (fromBranch.growthProgress < 0.9 || toBranch.growthProgress < 0.9) continue;

      // Draw from one branch tip to another with a gentle curve
      const fromCluster = this.clusters[fromBranch.clusterIndex];
      const toCluster = this.clusters[toBranch.clusterIndex];
      if (!fromCluster || !toCluster) continue;

      const x0 = fromCluster.x;
      const y0 = fromCluster.y;
      const x1 = toCluster.x;
      const y1 = toCluster.y;

      // Control point offset toward the core for a natural arc
      const cx = this.core.x + (x0 + x1 - 2 * this.core.x) * 0.2;
      const cy = this.core.y + (y0 + y1 - 2 * this.core.y) * 0.2;

      ctx.lineWidth = 0.4;
      ctx.strokeStyle = gold(conduit.opacity);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
    }
  }

  private drawCluster(cluster: ClusterState, visibilityAlpha: number): void {
    const { ctx, time } = this;
    ctx.lineCap = "round";

    const flashBoost =
      cluster.flashTimer > 0
        ? SIGNAL_FLASH_BOOST * (cluster.flashTimer / SIGNAL_FLASH_DURATION)
        : 0;

    for (let pass = 0; pass < 2; pass++) {
      const isGlow = pass === 0;
      for (const seg of cluster.segments) {
        const breathe = Math.sin(
          (TAU * time) / cluster.breatheRate + seg.breathePhase,
        );
        const len = seg.length + breathe * CLUSTER_BREATHE_AMOUNT;
        const half = len / 2;

        const cx = cluster.x + seg.offsetX;
        const cy = cluster.y + seg.offsetY;
        const x1 = cx + Math.cos(seg.angle) * half;
        const y1 = cy + Math.sin(seg.angle) * half;
        const x2 = cx - Math.cos(seg.angle) * half;
        const y2 = cy - Math.sin(seg.angle) * half;

        const baseOp = (cluster.baseOpacity + flashBoost) * visibilityAlpha;
        ctx.lineWidth = isGlow ? CLUSTER_LINE_WIDTH + 1.5 : CLUSTER_LINE_WIDTH;
        ctx.strokeStyle = gold(isGlow ? baseOp * 0.12 : baseOp);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  private drawSignal(signal: SignalState): void {
    const { ctx } = this;
    const branch = this.branches[signal.branchIndex];
    if (!branch) return;

    const visibleLen = branch.totalLength * branch.growthProgress;
    if (signal.distance > visibleLen) return;

    const pos = this.getPositionAlongPath(
      branch.points,
      branch.segLengths,
      signal.distance,
    );

    // Scale signal opacity by the branch's own opacity for consistency
    const adjustedOpacity = signal.opacity * Math.min(1, branch.opacity / 0.05);

    // Glow halo
    ctx.fillStyle = gold(adjustedOpacity * 0.25);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, SIGNAL_GLOW_RADIUS, 0, TAU);
    ctx.fill();

    // Bright dot
    ctx.fillStyle = gold(adjustedOpacity);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, SIGNAL_RADIUS, 0, TAU);
    ctx.fill();
  }

  // ── Utilities ──────────────────────────────────────

  private getPositionAlongPath(
    points: Point[],
    segLengths: number[],
    distance: number,
  ): Point {
    let remaining = distance;
    for (let i = 0; i < segLengths.length; i++) {
      if (remaining <= segLengths[i]) {
        const t = segLengths[i] > 0 ? remaining / segLengths[i] : 0;
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * t,
          y: points[i].y + (points[i + 1].y - points[i].y) * t,
        };
      }
      remaining -= segLengths[i];
    }
    const last = points[points.length - 1];
    return { x: last.x, y: last.y };
  }
}
