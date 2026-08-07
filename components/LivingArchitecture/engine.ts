/* ══════════════════════════════════════════════════════
   Living Architecture — Canvas 2D Engine
   Phase 3: Large-scale right-weighted system atlas

   Pure imperative JS. Zero React state in the render
   loop. All animation values live in plain objects
   updated via requestAnimationFrame with delta-time.

   Key Phase 3 changes:
   - Full-viewport canvas with right-weighted draw zone
   - Branches reconciled by stable string id, not index
   - Explicit breakpoint modes (desktop/tablet/mobile)
   - Mobile evolves through all 6 stages
   - Resize preserves the active visual stage
   - Cluster density animated per stage
   - Base-stroke ghost layer for visual hierarchy
   - Document-hidden pause, dynamic reduced-motion

   Draw order (back → front):
     1. Core outer halo
     2. Core radial glow
     3. Conduits
     4. Branch base strokes (ghost paths)
     5. Branch active strokes
     6. Core segments (glow pass, then sharp pass)
     7. Clusters  (glow pass, then sharp pass)
     8. Signals   (glow halo, then bright dot)
   ══════════════════════════════════════════════════════ */

import {
  accent,
  DPR_CAP,
  DRAW_ZONES,
  CORE_POSITIONS,
  CORE_CONFIGS,
  BRANCH_CONFIGS,
  CLUSTER_CONFIGS,
  CLUSTER_BREATHE_MIN,
  CLUSTER_BREATHE_MAX,
  ROLE_WIDTH_SCALE,
  ROLE_TRANSITION_DELAY,
  LENGTH_SCALE,
  BASE_STROKE_OPACITY,
  SIGNAL_RADIUS,
  SIGNAL_GLOW_RADIUS,
  SIGNAL_FLASH_DURATION,
  SIGNAL_FLASH_BOOST,
  FADE_IN_DURATION,
  CLUSTER_APPEAR_THRESHOLD,
  SIGNAL_READY_THRESHOLD,
  MOBILE_GLOBAL_OPACITY,
  type BreakpointMode,
  type BranchDef,
  type BranchRole,
} from "./config";

import { STAGES, STAGE_TRANSITION_DURATION, type StageConfig } from "./stages";

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
  /** 0-1 bias for per-cluster density variation within a stage's range. */
  densityBias: number;
  targetDensity: number;
  currentDensity: number;
}

interface BranchState {
  id: string;
  role: BranchRole;
  seed: number;
  baseAngle: number;
  segmentCount: number;
  angleVariance: number;
  points: Point[];
  segLengths: number[];
  totalLength: number;
  targetLength: number;
  currentLength: number;
  targetOpacity: number;
  currentOpacity: number;
  targetWidth: number;
  currentWidth: number;
  /** Engine-time at which this branch begins interpolating toward targets. */
  transitionStartTime: number;
  cluster: ClusterState;
}

interface SignalState {
  branchId: string;
  distance: number;
  speed: number;
  opacity: number;
  alive: boolean;
}

interface ConduitState {
  fromBranchId: string;
  toBranchId: string;
  opacity: number;
  targetOpacity: number;
}

// ── Animated scalar ────────────────────────────────────

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
  private viewportWidth = 0;
  private viewportHeight = 0;

  // Breakpoint
  private mode: BreakpointMode = "desktop";

  // State flags
  private reducedMotion: boolean;
  private running = false;
  private paused = false;

  // Draw zone (pixels)
  private dzLeft = 0;
  private dzRight = 0;
  private dzTop = 0;
  private dzBottom = 0;

  // PRNG
  private rng: () => number = mulberry32(7919);

  // Branch precomputation
  private maxLengths: Map<string, number> = new Map();
  private branchTemplates: Map<string, BranchDef> = new Map();

  // Core
  private core: CoreState = { x: 0, y: 0, segments: [] };

  // Branches
  private branchMap: Map<string, BranchState> = new Map();
  private branchDrawOrder: BranchState[] = [];

  // Signals
  private signals: SignalState[] = [];
  private maxSignals = 0;

  // Conduits
  private conduits: ConduitState[] = [];

  // Animated scalars
  private coreOpacity: AnimatedValue = { current: 0.5, target: 0.5 };
  private coreGlowScale: AnimatedValue = { current: 1, target: 1 };
  private coreBreathePeriod: AnimatedValue = { current: 3.5, target: 3.5 };
  private clusterOpacity: AnimatedValue = { current: 0.25, target: 0.25 };
  private systemPulseAmplitude: AnimatedValue = { current: 0, target: 0 };
  private signalSpawnMin: AnimatedValue = { current: 2.5, target: 2.5 };
  private signalSpawnMax: AnimatedValue = { current: 4.5, target: 4.5 };
  private signalSpeedMin: AnimatedValue = { current: 25, target: 25 };
  private signalSpeedMax: AnimatedValue = { current: 50, target: 50 };

  // Stage
  private currentStage = 0;

  // Timing
  private time = 0;
  private fadeInProgress = 0;
  private signalSpawnTimer = 0;

  // RAF
  private lastTimestamp = 0;
  private rafId = 0;

  // Interpolation speed (frame-rate independent).
  // 0.03 at 60 fps ≈ 2.2 s to 95 % convergence.
  private readonly interpSpeed = 0.03;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    reducedMotion: boolean,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.reducedMotion = reducedMotion;
    this.computeMaxLengths();
  }

  // ── Public API ─────────────────────────────────────

  resize(cssWidth: number, cssHeight: number, mode: BreakpointMode): void {
    if (cssWidth < 1 || cssHeight < 1) return;

    const changed =
      Math.abs(cssWidth - this.viewportWidth) > 0.5 ||
      Math.abs(cssHeight - this.viewportHeight) > 0.5 ||
      mode !== this.mode;
    if (!changed) return;

    const isFirstInit = this.branchDrawOrder.length === 0;

    this.viewportWidth = cssWidth;
    this.viewportHeight = cssHeight;
    this.mode = mode;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    this.dpr = dpr;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Compute draw zone in pixels
    const zone = DRAW_ZONES[mode];
    this.dzLeft = zone.left * cssWidth;
    this.dzRight = zone.right * cssWidth;
    this.dzTop = zone.top * cssHeight;
    this.dzBottom = zone.bottom * cssHeight;

    const savedStage = this.currentStage;

    this.rebuildGeometry();

    this.currentStage = savedStage;

    if (isFirstInit) {
      // First mount — set targets and let growth animation run
      this.applyStageTargets(STAGES[savedStage]);
    } else {
      // Subsequent resize — snap to current stage immediately
      this.applyStageImmediate(STAGES[savedStage]);
      this.fadeInProgress = 1;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
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

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTimestamp = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Render the complete composition for the current stage statically.
   *  Used for prefers-reduced-motion. */
  drawStatic(): void {
    // Snap every animated value to its target
    for (const branch of this.branchDrawOrder) {
      branch.currentLength = branch.targetLength;
      branch.currentOpacity = branch.targetOpacity;
      branch.currentWidth = branch.targetWidth;
      branch.transitionStartTime = 0;
      this.updateBranchEndpoint(branch);
      branch.cluster.currentDensity = branch.cluster.targetDensity;
    }

    this.coreOpacity.current = this.coreOpacity.target;
    this.coreGlowScale.current = this.coreGlowScale.target;
    this.coreBreathePeriod.current = this.coreBreathePeriod.target;
    this.clusterOpacity.current = this.clusterOpacity.target;
    this.systemPulseAmplitude.current = this.systemPulseAmplitude.target;
    this.signalSpawnMin.current = this.signalSpawnMin.target;
    this.signalSpawnMax.current = this.signalSpawnMax.target;
    this.signalSpeedMin.current = this.signalSpeedMin.target;
    this.signalSpeedMax.current = this.signalSpeedMax.target;

    for (const conduit of this.conduits) {
      conduit.opacity = conduit.targetOpacity;
    }

    // Kill signals for static render
    for (const sig of this.signals) {
      sig.alive = false;
    }

    this.fadeInProgress = 1;
    this.time = 0;
    this.draw();
  }

  /** Transition to a new stage.
   *  Called by the React component when IntersectionObserver
   *  detects a section change. Works for all breakpoint modes. */
  setStage(stageIndex: number): void {
    if (stageIndex < 0 || stageIndex >= STAGES.length) return;
    if (stageIndex === this.currentStage) return;
    this.currentStage = stageIndex;
    if (this.branchDrawOrder.length > 0) {
      this.applyStageTargets(STAGES[stageIndex]);
    }
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  // ── Precomputation ─────────────────────────────────

  /** Scan all stages to find the maximum length for each branch id. */
  private computeMaxLengths(): void {
    this.maxLengths.clear();
    this.branchTemplates.clear();
    for (const stage of STAGES) {
      for (const def of stage.branches) {
        const cur = this.maxLengths.get(def.id) ?? 0;
        if (def.length > cur) {
          this.maxLengths.set(def.id, def.length);
          this.branchTemplates.set(def.id, def);
        }
      }
    }
  }

  // ── System generation ──────────────────────────────

  private rebuildGeometry(): void {
    this.rng = mulberry32(7919);
    this.time = 0;
    this.fadeInProgress = 0;

    this.core = this.createCore();

    // Create a BranchState for every unique branch across all stages
    this.branchMap.clear();
    this.branchDrawOrder = [];
    this.conduits = [];

    for (const [id, maxLen] of this.maxLengths) {
      const template = this.branchTemplates.get(id)!;
      const branch = this.createBranch(template, maxLen);
      this.branchMap.set(id, branch);
      this.branchDrawOrder.push(branch);
    }

    // Sort draw order: trunk → primary → secondary → aspiration
    const roleOrder: Record<BranchRole, number> = {
      trunk: 0,
      primary: 1,
      secondary: 2,
      aspiration: 3,
    };
    this.branchDrawOrder.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

    // Initialize signal pool (empty, will be sized by stage)
    this.maxSignals = 0;
    this.signals = [];
    this.signalSpawnTimer = 5;
  }

  private createCore(): CoreState {
    const pos = CORE_POSITIONS[this.mode];
    const cx = this.viewportWidth * pos.x;
    const cy = this.viewportHeight * pos.y;
    const cfg = CORE_CONFIGS[this.mode];

    const segments: CoreSegment[] = [];
    for (let i = 0; i < cfg.segments; i++) {
      const baseAngle = (i / cfg.segments) * Math.PI;
      segments.push({
        angle: baseAngle + (this.rng() - 0.5) * 0.7,
        length: cfg.segLenMin + this.rng() * (cfg.segLenMax - cfg.segLenMin),
        breathePhase: this.rng() * TAU,
      });
    }

    return { x: cx, y: cy, segments };
  }

  private createBranch(template: BranchDef, maxLength: number): BranchState {
    const branchRng = mulberry32(template.seed);
    const branchCfg = BRANCH_CONFIGS[this.mode];
    const scaledMaxLen = maxLength * LENGTH_SCALE[this.mode];

    const startX =
      this.core.x + Math.cos(template.baseAngle) * branchCfg.startOffset;
    const startY =
      this.core.y + Math.sin(template.baseAngle) * branchCfg.startOffset;

    const points = generateBranchPath(
      startX,
      startY,
      template.baseAngle,
      scaledMaxLen,
      template.segmentCount,
      template.angleVariance,
      branchRng,
    );

    const { segLengths, totalLength } = computePathMetrics(points);

    const cluster = this.createCluster(template.seed);

    return {
      id: template.id,
      role: template.role,
      seed: template.seed,
      baseAngle: template.baseAngle,
      segmentCount: template.segmentCount,
      angleVariance: template.angleVariance,
      points,
      segLengths,
      totalLength,
      targetLength: 0,
      currentLength: 0,
      targetOpacity: 0,
      currentOpacity: 0,
      targetWidth: template.width * ROLE_WIDTH_SCALE[template.role],
      currentWidth: template.width * ROLE_WIDTH_SCALE[template.role],
      transitionStartTime: 0,
      cluster,
    };
  }

  private createCluster(seed: number): ClusterState {
    const clusterRng = mulberry32(seed + 9973);
    const cfg = CLUSTER_CONFIGS[this.mode];

    const segments: ClusterSegment[] = [];
    for (let i = 0; i < cfg.maxSegs; i++) {
      const a = clusterRng() * TAU;
      const d = clusterRng() * cfg.radius;
      segments.push({
        offsetX: Math.cos(a) * d,
        offsetY: Math.sin(a) * d,
        angle: clusterRng() * Math.PI,
        length: cfg.segLenMin + clusterRng() * (cfg.segLenMax - cfg.segLenMin),
        breathePhase: clusterRng() * TAU,
      });
    }

    return {
      x: 0,
      y: 0,
      segments,
      breatheRate:
        CLUSTER_BREATHE_MIN +
        clusterRng() * (CLUSTER_BREATHE_MAX - CLUSTER_BREATHE_MIN),
      baseOpacity: 0.25,
      flashTimer: 0,
      densityBias: clusterRng(),
      targetDensity: 2,
      currentDensity: 2,
    };
  }

  // ── Stage management ───────────────────────────────

  /** Set target values for a smooth animated transition. */
  private applyStageTargets(stage: StageConfig): void {
    // Reset all branches to "not in this stage"
    for (const branch of this.branchDrawOrder) {
      branch.targetOpacity = 0;
      branch.targetLength = 0;
    }

    // Apply stage-specific branch targets
    const scale = LENGTH_SCALE[this.mode];
    for (const def of stage.branches) {
      const branch = this.branchMap.get(def.id);
      if (!branch) continue;

      const overrideOp = stage.branchOpacityOverrides[def.id];
      const opacity = overrideOp !== undefined ? overrideOp : def.opacity;
      const length = Math.min(def.length * scale, branch.totalLength);
      const width = def.width * ROLE_WIDTH_SCALE[def.role];

      branch.targetOpacity = opacity;
      branch.targetLength = length;
      branch.targetWidth = width;
      branch.transitionStartTime =
        this.time +
        ROLE_TRANSITION_DELAY[def.role] * STAGE_TRANSITION_DURATION;
    }

    // Breakpoint-based branch limiting
    this.applyBranchLimit();

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

    // Signal pool
    const branchCfg = BRANCH_CONFIGS[this.mode];
    this.maxSignals = Math.min(stage.signalMax, branchCfg.maxSignals);
    while (this.signals.length < this.maxSignals) {
      this.signals.push({
        branchId: "",
        distance: 0,
        speed: 0,
        opacity: 0,
        alive: false,
      });
    }

    // Conduits
    const targetConduits = Math.min(
      stage.conduitCount,
      branchCfg.maxConduits,
    );
    this.reconcileConduits(targetConduits);

    // Cluster density targets
    const [minD, maxD] = stage.clusterSegRange;
    for (const branch of this.branchDrawOrder) {
      branch.cluster.targetDensity =
        minD + branch.cluster.densityBias * (maxD - minD);
    }
  }

  /** Snap all animated values to their targets — used after resize. */
  private applyStageImmediate(stage: StageConfig): void {
    this.applyStageTargets(stage);

    for (const branch of this.branchDrawOrder) {
      branch.currentLength = branch.targetLength;
      branch.currentOpacity = branch.targetOpacity;
      branch.currentWidth = branch.targetWidth;
      branch.transitionStartTime = 0;
      this.updateBranchEndpoint(branch);
      branch.cluster.currentDensity = branch.cluster.targetDensity;
    }

    this.coreOpacity.current = this.coreOpacity.target;
    this.coreGlowScale.current = this.coreGlowScale.target;
    this.coreBreathePeriod.current = this.coreBreathePeriod.target;
    this.clusterOpacity.current = this.clusterOpacity.target;
    this.systemPulseAmplitude.current = this.systemPulseAmplitude.target;
    this.signalSpawnMin.current = this.signalSpawnMin.target;
    this.signalSpawnMax.current = this.signalSpawnMax.target;
    this.signalSpeedMin.current = this.signalSpeedMin.target;
    this.signalSpeedMax.current = this.signalSpeedMax.target;

    for (const conduit of this.conduits) {
      conduit.opacity = conduit.targetOpacity;
    }
  }

  /** Limit visible branches to the breakpoint maximum.
   *  Trunk always kept; others ranked by target opacity. */
  private applyBranchLimit(): void {
    const maxB = BRANCH_CONFIGS[this.mode].maxBranches;
    if (this.branchDrawOrder.length <= maxB) return;

    const ranked = [...this.branchDrawOrder].sort((a, b) => {
      if (a.role === "trunk" && b.role !== "trunk") return -1;
      if (b.role === "trunk" && a.role !== "trunk") return 1;
      return b.targetOpacity - a.targetOpacity;
    });

    for (let i = maxB; i < ranked.length; i++) {
      ranked[i].targetOpacity = 0;
      ranked[i].targetLength = 0;
    }
  }

  /** Reconcile conduits (cross-branch connections). */
  private reconcileConduits(targetCount: number): void {
    const visible = this.branchDrawOrder.filter(
      (b) => b.targetOpacity > 0.02 && b.targetLength > 30,
    );
    visible.sort((a, b) => b.targetOpacity - a.targetOpacity);

    const pairs: [string, string][] = [];
    if (visible.length >= 3) pairs.push([visible[0].id, visible[2].id]);
    if (visible.length >= 5) pairs.push([visible[1].id, visible[4].id]);
    if (visible.length >= 7) pairs.push([visible[2].id, visible[5].id]);

    // Fade out excess conduits
    for (let i = targetCount; i < this.conduits.length; i++) {
      this.conduits[i].targetOpacity = 0;
    }

    // Activate or create conduits up to targetCount
    for (let i = 0; i < Math.min(targetCount, pairs.length); i++) {
      if (i < this.conduits.length) {
        this.conduits[i].fromBranchId = pairs[i][0];
        this.conduits[i].toBranchId = pairs[i][1];
        this.conduits[i].targetOpacity = 0.035;
      } else {
        this.conduits.push({
          fromBranchId: pairs[i][0],
          toBranchId: pairs[i][1],
          opacity: 0,
          targetOpacity: 0.035,
        });
      }
    }

    // Re-activate existing conduits that are within targetCount
    for (let i = 0; i < Math.min(targetCount, this.conduits.length); i++) {
      this.conduits[i].targetOpacity = 0.035;
    }
  }

  // ── Animation loop ─────────────────────────────────

  private tick = (timestamp: number): void => {
    if (!this.running || this.paused) return;

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
    if (this.fadeInProgress < 1) {
      const t = this.time / FADE_IN_DURATION;
      this.fadeInProgress = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
    }

    // Interpolate animated scalars
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

    // Branches
    this.updateBranches(dt);

    // Conduit opacity
    for (const conduit of this.conduits) {
      conduit.opacity +=
        (conduit.targetOpacity - conduit.opacity) * spd * dt * 60;
    }

    // Signals
    this.updateSignals(dt);
  }

  private updateBranches(dt: number): void {
    const spd = this.interpSpeed;
    for (const branch of this.branchDrawOrder) {
      // Delay-gated interpolation
      if (this.time < branch.transitionStartTime) continue;

      branch.currentLength +=
        (branch.targetLength - branch.currentLength) * spd * dt * 60;
      branch.currentOpacity +=
        (branch.targetOpacity - branch.currentOpacity) * spd * dt * 60;
      branch.currentWidth +=
        (branch.targetWidth - branch.currentWidth) * spd * dt * 60;

      // Cluster density
      branch.cluster.currentDensity +=
        (branch.cluster.targetDensity - branch.cluster.currentDensity) *
        spd *
        dt *
        60;

      // Update cluster position from current endpoint
      this.updateBranchEndpoint(branch);
    }

    // Update cluster flash timers
    for (const branch of this.branchDrawOrder) {
      if (branch.cluster.flashTimer > 0) {
        branch.cluster.flashTimer = Math.max(
          0,
          branch.cluster.flashTimer - dt,
        );
      }
    }
  }

  private updateSignals(dt: number): void {
    // Check if any branch is signal-ready
    const anyReady = this.branchDrawOrder.some((b) => {
      if (b.targetLength < 1 || b.currentOpacity < 0.01) return false;
      return b.currentLength / b.targetLength >= SIGNAL_READY_THRESHOLD;
    });

    // Move existing signals
    for (const sig of this.signals) {
      if (!sig.alive) continue;
      sig.distance += sig.speed * dt;

      const branch = this.branchMap.get(sig.branchId);
      if (!branch || branch.currentOpacity < 0.005) {
        sig.alive = false;
        continue;
      }
      if (sig.distance >= branch.currentLength) {
        sig.alive = false;
        const visFrac =
          branch.totalLength > 0
            ? branch.currentLength / branch.totalLength
            : 0;
        if (visFrac > 0.5) {
          branch.cluster.flashTimer = SIGNAL_FLASH_DURATION;
        }
      }
    }

    // Spawn
    if (anyReady && this.maxSignals > 0) {
      this.signalSpawnTimer -= dt;
      if (this.signalSpawnTimer <= 0) {
        this.spawnSignal();
        const sMin = this.signalSpawnMin.current;
        const sMax = this.signalSpawnMax.current;
        this.signalSpawnTimer = sMin + this.rng() * (sMax - sMin);
      }
    }
  }

  private spawnSignal(): void {
    const slot = this.signals.find((s) => !s.alive);
    if (!slot) return;

    const viable: BranchState[] = [];
    for (const branch of this.branchDrawOrder) {
      if (
        branch.currentOpacity > 0.01 &&
        branch.currentLength > 50 * LENGTH_SCALE[this.mode]
      ) {
        viable.push(branch);
      }
    }
    if (viable.length === 0) return;

    const chosen = viable[Math.floor(this.rng() * viable.length)];

    slot.branchId = chosen.id;
    slot.distance = 0;
    slot.speed =
      this.signalSpeedMin.current +
      this.rng() * (this.signalSpeedMax.current - this.signalSpeedMin.current);
    slot.opacity = 0.3 + this.rng() * 0.15;
    slot.alive = true;
  }

  // ── Drawing ────────────────────────────────────────

  private draw(): void {
    const { ctx, viewportWidth, viewportHeight } = this;
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    let globalAlpha =
      this.fadeInProgress * (this.mode === "mobile" ? MOBILE_GLOBAL_OPACITY : 1);

    // System heartbeat pulse
    if (this.systemPulseAmplitude.current > 0.001) {
      const pulse =
        Math.sin((this.time * TAU) / 4.0) *
        this.systemPulseAmplitude.current;
      globalAlpha *= 1 + pulse;
    }

    if (globalAlpha < 0.001) return;

    ctx.save();
    ctx.globalAlpha = globalAlpha;

    // Clip to draw zone
    ctx.beginPath();
    ctx.rect(
      this.dzLeft,
      this.dzTop,
      this.dzRight - this.dzLeft,
      this.dzBottom - this.dzTop,
    );
    ctx.clip();

    // 1. Core outer halo
    this.drawCoreHalo();

    // 2. Core radial glow
    this.drawCoreGlow();

    // 3. Conduits
    this.drawConduits();

    // 4. Branch base strokes (ghost paths)
    for (const branch of this.branchDrawOrder) {
      if (branch.currentOpacity > 0.003) {
        this.drawBranchBaseStroke(branch);
      }
    }

    // 5. Branch active strokes
    for (const branch of this.branchDrawOrder) {
      if (branch.currentLength > 0.5 && branch.currentOpacity > 0.003) {
        this.drawBranchActive(branch);
      }
    }

    // 6. Core segments
    this.drawCoreSegments();

    // 7. Clusters
    for (const branch of this.branchDrawOrder) {
      if (branch.currentOpacity < 0.003) continue;
      const visFrac =
        branch.targetLength > 0
          ? branch.currentLength / branch.targetLength
          : 0;
      if (visFrac > CLUSTER_APPEAR_THRESHOLD) {
        const growthAlpha = Math.min(
          1,
          (visFrac - CLUSTER_APPEAR_THRESHOLD) /
            (1 - CLUSTER_APPEAR_THRESHOLD),
        );
        const opacityFactor = this.clusterOpacity.current / 0.25;
        this.drawCluster(branch.cluster, growthAlpha * opacityFactor);
      }
    }

    // 8. Signals
    for (const sig of this.signals) {
      if (sig.alive) this.drawSignal(sig);
    }

    ctx.restore();
  }

  private drawCoreHalo(): void {
    const cfg = CORE_CONFIGS[this.mode];
    if (cfg.haloRadius <= 0) return;

    const r = cfg.haloRadius * this.coreGlowScale.current;
    const opacity = cfg.haloOpacity * this.coreGlowScale.current;
    if (opacity < 0.001) return;

    const grad = this.ctx.createRadialGradient(
      this.core.x,
      this.core.y,
      0,
      this.core.x,
      this.core.y,
      r,
    );
    grad.addColorStop(0, accent(opacity));
    grad.addColorStop(0.45, accent(opacity * 0.3));
    grad.addColorStop(1, accent(0));

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(this.core.x, this.core.y, r, 0, TAU);
    this.ctx.fill();
  }

  private drawCoreGlow(): void {
    const cfg = CORE_CONFIGS[this.mode];
    const r = cfg.glowRadius * this.coreGlowScale.current;
    const opacity = cfg.glowOpacity * this.coreGlowScale.current;
    if (opacity < 0.001) return;

    const grad = this.ctx.createRadialGradient(
      this.core.x,
      this.core.y,
      0,
      this.core.x,
      this.core.y,
      r,
    );
    grad.addColorStop(0, accent(opacity));
    grad.addColorStop(0.6, accent(opacity * 0.4));
    grad.addColorStop(1, accent(0));

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(this.core.x, this.core.y, r, 0, TAU);
    this.ctx.fill();
  }

  private drawCoreSegments(): void {
    const { ctx, core, time } = this;
    const cfg = CORE_CONFIGS[this.mode];
    const breathePeriod = this.coreBreathePeriod.current;
    const coreOp = this.coreOpacity.current;
    const breatheAmt = cfg.breatheAmount;

    ctx.lineCap = "round";

    for (let pass = 0; pass < 2; pass++) {
      const isGlow = pass === 0;
      for (const seg of core.segments) {
        const breathe =
          breatheAmt > 0
            ? Math.sin((TAU * time) / breathePeriod + seg.breathePhase)
            : 0;
        const len = seg.length + breathe * breatheAmt;
        const half = len / 2;
        const x1 = core.x + Math.cos(seg.angle) * half;
        const y1 = core.y + Math.sin(seg.angle) * half;
        const x2 = core.x - Math.cos(seg.angle) * half;
        const y2 = core.y - Math.sin(seg.angle) * half;

        ctx.lineWidth = isGlow ? cfg.lineWidth + 2 : cfg.lineWidth;
        ctx.strokeStyle = accent(isGlow ? coreOp * 0.15 : coreOp);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  /** Draw a faint ghost of the branch path up to its targetLength. */
  private drawBranchBaseStroke(branch: BranchState): void {
    const baseOp = branch.currentOpacity * BASE_STROKE_OPACITY;
    if (baseOp < 0.002) return;

    const drawLen = branch.targetLength;
    if (drawLen < 1) return;

    const { ctx } = this;
    ctx.lineWidth = branch.currentWidth * 0.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = accent(baseOp);

    ctx.beginPath();
    ctx.moveTo(branch.points[0].x, branch.points[0].y);

    let drawn = 0;
    for (let i = 0; i < branch.segLengths.length; i++) {
      const next = drawn + branch.segLengths[i];
      if (next <= drawLen) {
        ctx.lineTo(branch.points[i + 1].x, branch.points[i + 1].y);
        drawn = next;
      } else {
        const remaining = drawLen - drawn;
        const t = branch.segLengths[i] > 0 ? remaining / branch.segLengths[i] : 0;
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

  /** Draw the active branch stroke up to currentLength. */
  private drawBranchActive(branch: BranchState): void {
    const visibleLen = branch.currentLength;
    if (visibleLen < 0.5) return;

    const { ctx } = this;
    ctx.lineWidth = branch.currentWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = accent(branch.currentOpacity);

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
        const t = branch.segLengths[i] > 0 ? remaining / branch.segLengths[i] : 0;
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

      const fromBranch = this.branchMap.get(conduit.fromBranchId);
      const toBranch = this.branchMap.get(conduit.toBranchId);
      if (!fromBranch || !toBranch) continue;

      const fromFrac =
        fromBranch.totalLength > 0
          ? fromBranch.currentLength / fromBranch.totalLength
          : 0;
      const toFrac =
        toBranch.totalLength > 0
          ? toBranch.currentLength / toBranch.totalLength
          : 0;
      if (fromFrac < 0.85 || toFrac < 0.85) continue;

      const x0 = fromBranch.cluster.x;
      const y0 = fromBranch.cluster.y;
      const x1 = toBranch.cluster.x;
      const y1 = toBranch.cluster.y;

      const cx =
        this.core.x + (x0 + x1 - 2 * this.core.x) * 0.2;
      const cy =
        this.core.y + (y0 + y1 - 2 * this.core.y) * 0.2;

      ctx.lineWidth = 0.45;
      ctx.strokeStyle = accent(conduit.opacity);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
    }
  }

  private drawCluster(cluster: ClusterState, visibilityAlpha: number): void {
    const { ctx, time } = this;
    const cfg = CLUSTER_CONFIGS[this.mode];
    const breatheAmt = cfg.breatheAmount;

    const flashBoost =
      cluster.flashTimer > 0
        ? SIGNAL_FLASH_BOOST * (cluster.flashTimer / SIGNAL_FLASH_DURATION)
        : 0;

    ctx.lineCap = "round";

    const density = cluster.currentDensity;

    for (let pass = 0; pass < 2; pass++) {
      const isGlow = pass === 0;
      for (let si = 0; si < cluster.segments.length; si++) {
        // Per-segment density gating
        let segAlpha: number;
        if (si < Math.floor(density)) {
          segAlpha = 1;
        } else if (si < Math.ceil(density)) {
          segAlpha = density - Math.floor(density);
        } else {
          continue;
        }
        if (segAlpha < 0.01) continue;

        const seg = cluster.segments[si];
        const breathe =
          breatheAmt > 0
            ? Math.sin((TAU * time) / cluster.breatheRate + seg.breathePhase)
            : 0;
        const len = seg.length + breathe * breatheAmt;
        const half = len / 2;

        const cx = cluster.x + seg.offsetX;
        const cy = cluster.y + seg.offsetY;
        const x1 = cx + Math.cos(seg.angle) * half;
        const y1 = cy + Math.sin(seg.angle) * half;
        const x2 = cx - Math.cos(seg.angle) * half;
        const y2 = cy - Math.sin(seg.angle) * half;

        const baseOp =
          (cluster.baseOpacity + flashBoost) * visibilityAlpha * segAlpha;
        ctx.lineWidth = isGlow ? cfg.lineWidth + 1.5 : cfg.lineWidth;
        ctx.strokeStyle = accent(isGlow ? baseOp * 0.12 : baseOp);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  private drawSignal(signal: SignalState): void {
    const { ctx } = this;
    const branch = this.branchMap.get(signal.branchId);
    if (!branch) return;

    if (signal.distance > branch.currentLength) return;

    const pos = this.getPositionAlongPath(
      branch.points,
      branch.segLengths,
      signal.distance,
    );

    // Scale signal opacity by the branch's own opacity
    const adjustedOpacity =
      signal.opacity * Math.min(1, branch.currentOpacity / 0.05);

    // Glow halo
    ctx.fillStyle = accent(adjustedOpacity * 0.25);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, SIGNAL_GLOW_RADIUS, 0, TAU);
    ctx.fill();

    // Bright dot
    ctx.fillStyle = accent(adjustedOpacity);
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

  /** Update a branch's cluster position to the branch's current endpoint. */
  private updateBranchEndpoint(branch: BranchState): void {
    if (branch.currentLength < 0.1) {
      branch.cluster.x = branch.points[0].x;
      branch.cluster.y = branch.points[0].y;
      return;
    }
    const pos = this.getPositionAlongPath(
      branch.points,
      branch.segLengths,
      branch.currentLength,
    );
    branch.cluster.x = pos.x;
    branch.cluster.y = pos.y;
  }
}
