/* ══════════════════════════════════════════════════════
   Living Architecture — Canvas 2D Engine
   Phase 1: Core + Branches + Clusters + Signals

   Pure imperative JS. Zero React state in the render
   loop. All animation values live in plain objects
   updated via requestAnimationFrame with delta‑time.

   Draw order (back → front):
     1. Core radial glow
     2. Branches (behind the core)
     3. Core segments (glow pass, then sharp pass)
     4. Clusters  (glow pass, then sharp pass)
     5. Signals   (glow halo, then bright dot)
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
  CORE_OPACITY,
  CORE_BREATHE_PERIOD,
  CORE_BREATHE_AMOUNT,
  CORE_LINE_WIDTH,
  CORE_GLOW_RADIUS,
  CORE_GLOW_RADIUS_COMPACT,
  CORE_GLOW_OPACITY,
  DESKTOP_CORE_Y,
  COMPACT_CORE_Y,
  BRANCH_DEFS,
  BRANCH_DEFS_COMPACT,
  BRANCH_START_OFFSET,
  BRANCH_START_OFFSET_COMPACT,
  CLUSTER_SEG_MIN,
  CLUSTER_SEG_MAX,
  CLUSTER_SEG_LEN_MIN,
  CLUSTER_SEG_LEN_MAX,
  CLUSTER_RADIUS,
  CLUSTER_RADIUS_COMPACT,
  CLUSTER_BREATHE_MIN,
  CLUSTER_BREATHE_MAX,
  CLUSTER_BREATHE_AMOUNT,
  CLUSTER_BASE_OPACITY,
  CLUSTER_LINE_WIDTH,
  SIGNAL_MAX,
  SIGNAL_MAX_COMPACT,
  SIGNAL_RADIUS,
  SIGNAL_GLOW_RADIUS,
  SIGNAL_OPACITY_MIN,
  SIGNAL_OPACITY_MAX,
  SIGNAL_SPEED_MIN,
  SIGNAL_SPEED_MAX,
  SIGNAL_SPAWN_MIN,
  SIGNAL_SPAWN_MAX,
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
  width: number;
  clusterIndex: number;
  growthProgress: number;
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
    angle += (baseAngle - angle) * 0.12; // gentle homing toward base direction
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

  // Master PRNG for core/cluster/signal generation
  private rng: () => number = mulberry32(7919);

  // System state
  private core!: CoreState;
  private branches: BranchState[] = [];
  private clusters: ClusterState[] = [];
  private signals: SignalState[] = [];

  // Timing
  private time = 0;
  private fadeInProgress = 0;
  private signalSpawnTimer = 0;

  // RAF
  private running = false;
  private lastTimestamp = 0;
  private rafId = 0;

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

  /** Draw the system at its fully‑grown resting state (for prefers‑reduced‑motion). */
  drawStatic(): void {
    for (const branch of this.branches) {
      branch.growthProgress = 1;
    }
    this.fadeInProgress = 1;
    this.time = 0;
    this.draw();
  }

  // ── System generation ──────────────────────────────

  private initSystem(): void {
    this.isCompact = this.width < COMPACT_THRESHOLD;
    this.rng = mulberry32(7919);
    this.time = 0;
    this.fadeInProgress = 0;

    this.clusters = [];
    this.core = this.createCore();

    const defs = this.isCompact ? BRANCH_DEFS_COMPACT : BRANCH_DEFS;
    const delays = this.isCompact ? GROWTH_DELAYS_COMPACT : GROWTH_DELAYS;
    this.branches = defs.map((def, i) => this.createBranch(def, i, delays));

    const maxSigs = this.isCompact ? SIGNAL_MAX_COMPACT : SIGNAL_MAX;
    this.signals = [];
    for (let i = 0; i < maxSigs; i++) {
      this.signals.push({
        branchIndex: 0,
        distance: 0,
        speed: 0,
        opacity: 0,
        alive: false,
      });
    }

    this.signalSpawnTimer = SIGNAL_SPAWN_MAX;
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

    return { x: cx, y: cy, segments, opacity: CORE_OPACITY };
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
    const clusterSegCount =
      CLUSTER_SEG_MIN +
      Math.floor(this.rng() * (CLUSTER_SEG_MAX - CLUSTER_SEG_MIN + 1));
    const clusterR = this.isCompact ? CLUSTER_RADIUS_COMPACT : CLUSTER_RADIUS;
    const cluster = this.createCluster(endPt.x, endPt.y, clusterSegCount, clusterR);
    const clusterIndex = this.clusters.length;
    this.clusters.push(cluster);

    return {
      points,
      segLengths,
      totalLength,
      opacity: def.opacity,
      width: def.width,
      clusterIndex,
      growthProgress: 0,
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
      baseOpacity: CLUSTER_BASE_OPACITY,
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

    // Global fade‑in
    if (this.time < FADE_IN_DURATION) {
      const t = this.time / FADE_IN_DURATION;
      this.fadeInProgress = 1 - Math.pow(1 - t, 3);
    } else {
      this.fadeInProgress = 1;
    }

    // Branch growth (time‑based ease‑out cubic)
    for (const branch of this.branches) {
      if (this.time < branch.growthDelay) continue;
      const elapsed = this.time - branch.growthDelay;
      const t = Math.min(1, elapsed / branch.growthDuration);
      branch.growthProgress = 1 - Math.pow(1 - t, 3);
    }

    // Signals
    this.updateSignals(dt);
  }

  private updateSignals(dt: number): void {
    const allReady = this.branches.every(
      (b) => b.growthProgress > SIGNAL_READY_THRESHOLD,
    );

    // Move existing signals
    for (const sig of this.signals) {
      if (!sig.alive) continue;
      sig.distance += sig.speed * dt;

      const branch = this.branches[sig.branchIndex];
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
        this.signalSpawnTimer =
          SIGNAL_SPAWN_MIN + this.rng() * (SIGNAL_SPAWN_MAX - SIGNAL_SPAWN_MIN);
      }
    }
  }

  private spawnSignal(): void {
    const slot = this.signals.find((s) => !s.alive);
    if (!slot || this.branches.length === 0) return;

    slot.branchIndex = Math.floor(this.rng() * this.branches.length);
    slot.distance = 0;
    slot.speed =
      SIGNAL_SPEED_MIN + this.rng() * (SIGNAL_SPEED_MAX - SIGNAL_SPEED_MIN);
    slot.opacity =
      SIGNAL_OPACITY_MIN +
      this.rng() * (SIGNAL_OPACITY_MAX - SIGNAL_OPACITY_MIN);
    slot.alive = true;
  }

  // ── Drawing ────────────────────────────────────────

  private draw(): void {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    const globalAlpha =
      this.fadeInProgress * (this.isCompact ? COMPACT_GLOBAL_OPACITY : 1);
    if (globalAlpha < 0.001) return;
    ctx.globalAlpha = globalAlpha;

    this.drawCoreGlow();

    for (const branch of this.branches) {
      if (branch.growthProgress > 0.01) {
        this.drawBranch(branch);
      }
    }

    this.drawCoreSegments();

    for (const branch of this.branches) {
      if (branch.growthProgress > CLUSTER_APPEAR_THRESHOLD) {
        const cluster = this.clusters[branch.clusterIndex];
        if (cluster) {
          const alpha = Math.min(
            1,
            (branch.growthProgress - CLUSTER_APPEAR_THRESHOLD) /
              (1 - CLUSTER_APPEAR_THRESHOLD),
          );
          this.drawCluster(cluster, alpha);
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

  /* Soft radial warmth behind the core. */
  private drawCoreGlow(): void {
    const { ctx, core, isCompact } = this;
    const r = isCompact ? CORE_GLOW_RADIUS_COMPACT : CORE_GLOW_RADIUS;
    const grad = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, r);
    grad.addColorStop(0, gold(CORE_GLOW_OPACITY));
    grad.addColorStop(0.6, gold(CORE_GLOW_OPACITY * 0.4));
    grad.addColorStop(1, gold(0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(core.x, core.y, r, 0, TAU);
    ctx.fill();
  }

  /* Core segments in two passes: soft glow then sharp line. */
  private drawCoreSegments(): void {
    const { ctx, core, time } = this;
    ctx.lineCap = "round";

    for (let pass = 0; pass < 2; pass++) {
      const isGlow = pass === 0;
      for (const seg of core.segments) {
        const breathe = Math.sin(
          (TAU * time) / CORE_BREATHE_PERIOD + seg.breathePhase,
        );
        const len = seg.length + breathe * CORE_BREATHE_AMOUNT;
        const half = len / 2;
        const x1 = core.x + Math.cos(seg.angle) * half;
        const y1 = core.y + Math.sin(seg.angle) * half;
        const x2 = core.x - Math.cos(seg.angle) * half;
        const y2 = core.y - Math.sin(seg.angle) * half;

        ctx.lineWidth = isGlow ? CORE_LINE_WIDTH + 2 : CORE_LINE_WIDTH;
        ctx.strokeStyle = gold(isGlow ? core.opacity * 0.15 : core.opacity);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  /* A single branch polyline, drawn only up to its current growth. */
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

  /* Cluster segments with flash‑on‑signal‑arrival. */
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

  /* Signal dot with a soft glow halo. */
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

    // Glow halo
    ctx.fillStyle = gold(signal.opacity * 0.25);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, SIGNAL_GLOW_RADIUS, 0, TAU);
    ctx.fill();

    // Bright dot
    ctx.fillStyle = gold(signal.opacity);
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
