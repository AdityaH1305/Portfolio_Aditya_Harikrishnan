import { deviceTier, dprCap, startPerfLevel } from "@/lib/deviceTier";
import { advance, createBudget, type FrameBudget } from "@/lib/frameBudget";
import { SKILLS } from "./data";
import {
    solve,
    positionAt,
    glowRadius,
    type Anchor,
    type Orbit,
    type ViewMode,
} from "./layout";
import {
    MAX_FLING,
    DRAG_DECAY,
    RETURN_S,
    flightPhase,
    easeReturn,
} from "./flight";

/* ══════════════════════════════════════════════════════
   SkillOrbit engine

   Target-driven with frame-based easing, the same shape as
   LivingArchitecture's: the solver says where a body should
   be this instant, and the body walks toward it. Everything
   else falls out of that.

   The payoff is the regroup. Swapping the solution swaps
   every target, and the existing walk performs the whole
   wormhole transition — there is no separate "animate to
   project view" code path, and therefore no second path to
   get out of sync. Reversing it is the same operation.

   Drag is the one state that overrides the walk, and it
   hands back to it by way of a free-flight state so a fling
   decays into an orbit rather than snapping.
   ══════════════════════════════════════════════════════ */

export interface Palette {
    /** `r g b` channels, read from --accent-rgb so canvas and DOM can't drift. */
    accent: [number, number, number];
    /** `--text-primary`. The ice: labels, and the nearest stars. */
    ice: [number, number, number];
    /** `--text-tertiary`. An unlit body is quiet, not accent-coloured. */
    muted: [number, number, number];
    /**
     * The RESOLVED `--font-jetbrains-mono` stack, e.g.
     * `"JetBrains Mono", "JetBrains Mono Fallback"`.
     *
     * IT CANNOT BE THE `var()` ITSELF. Canvas 2D parses `font` as a CSS
     * shorthand with no element context, so `var()` is never substituted:
     * the assignment fails to parse and is DISCARDED SILENTLY, leaving the
     * context on whatever it held before — `10px sans-serif` by default.
     * That is what this canvas was drawing every label in. Verified in
     * Chrome: after assigning
     * `600 11px var(--font-jetbrains-mono), monospace`, `ctx.font` still
     * reads back `10px sans-serif`.
     *
     * The literal `"JetBrains Mono"` does parse, but the resolved variable
     * also carries next/font's metric-matched fallback, so it is the better
     * of the two and keeps the single-source rule the accent already follows.
     */
    mono: string;
}

/** How fast a body closes on its target. Frame-rate compensated below. */
const FOLLOW = 0.075;
/** Seconds the wormhole flourish lasts. Purely cosmetic; the walk is what moves bodies. */
const WORMHOLE_S = 0.9;
/** Label fades in within this distance of the pointer, px. */
const LABEL_RADIUS = 165;
/** Hit radius for a body, px — generous, these are small dots. */
export const HIT_RADIUS = 22;

const DPR_CAP = 1.5;
const STAR_COUNT = 140;

/* ── What this canvas knows how to give up ──────────────
   Level 1 halves the DRAW rate; level 2 also softens the backing store.
   `update()` still receives the whole elapsed time either way, so the field
   moves at exactly the same speed — it is drawn less often, not slowed down,
   which is the distinction that keeps a degraded frame from reading as lag.

   Two levels, not the atlas's four. That engine has a signal budget and a
   cluster count to trade away; this one has a fill rate and nothing else, so
   inventing a third rung would mean inventing something for it to cut. */
const MAX_PERF_LEVEL = 2;
/** Backing-store multiplier per level. ~44% fewer pixels at level 2. */
const LEVEL_SCALE = [1, 1, 0.75];

type BodyState = "orbit" | "drag" | "free" | "return";

interface Body {
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: BodyState;
    /** 0…1, eased. Drives label alpha and dot size. */
    focus: number;
    lit: number;
    /** Seconds spent in free flight since release. */
    freeT: number;
    /** Seconds since it left the field bounds; 0 while inside. */
    offT: number;
    /** Progress 0…1 through the return leg. */
    retT: number;
    /** Where the return started — the target moves, this does not. */
    retX: number;
    retY: number;
}

/** Deterministic hash → 0…1. Index-based, so the starfield is stable. */
function h(n: number, salt: number): number {
    const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

export class SkillOrbitEngine {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private w = 0;
    private h = 0;
    private dpr = 1;
    /* Seeded from the device rather than starting at 0 everywhere: the budget
       below only learns by dropping frames first, and on hardware that was
       never going to hold 60fps that is a second of visible stutter to reach
       a conclusion `deviceTier()` already had at mount. */
    private budget: FrameBudget = createBudget(startPerfLevel(deviceTier()));
    private appliedLevel = -1;
    private dprScale = 1;
    /** Elapsed time not yet drawn, so a skipped frame is not lost motion. */
    private renderAccum = 0;

    private bodies: Body[] = SKILLS.map(() => ({
        x: 0, y: 0, vx: 0, vy: 0, state: "orbit", focus: 0, lit: 1,
        freeT: 0, offT: 0, retT: 0, retX: 0, retY: 0,
    }));

    private anchors: Anchor[] = [];
    private orbits: Orbit[] = [];
    private anchorById = new Map<string, Anchor>();

    private mode: ViewMode = { mode: "category" };
    private t = 0;
    private last = 0;
    private wormhole = 0;
    private wormholeAt: { x: number; y: number } | null = null;

    private pointer: { x: number; y: number } | null = null;
    private dragging = -1;
    private selected = -1;

    private stars: HTMLCanvasElement | null = null;
    private palette: Palette;
    private reduced: boolean;
    private seeded = false;

    private accentCache = new Map<number, string>();
    private iceCache = new Map<number, string>();
    private mutedCache = new Map<number, string>();
    private unitGlow: CanvasGradient | null = null;

    /* Built once from `palette.mono`. Assigning `font` re-parses a CSS
       shorthand, and the loops below were doing it per anchor and per focused
       body; the string never changes, so neither does the parse need to. */
    private readonly fontAnchor: string;
    private readonly fontBody: string;

    /** Reused across frames — one Set allocation instead of sixty a second. */
    private seenOrbits = new Set<string>();

    constructor(
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        palette: Palette,
        reducedMotion: boolean,
    ) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.palette = palette;
        this.reduced = reducedMotion;
        this.fontAnchor = `600 11px ${palette.mono}, ui-monospace, monospace`;
        this.fontBody = `500 11px ${palette.mono}, ui-monospace, monospace`;
    }

    /* One string per (colour, quantised alpha) instead of one per call.
       The atlas already does this — `accent()` in LivingArchitecture/config.ts
       — and the reasoning carries over exactly: three decimal places is far
       below what an 8-bit channel can show, and this draw loop was building
       around forty short-lived strings a frame. */
    private static tint(
        rgb: readonly [number, number, number],
        cache: Map<number, string>,
        a: number,
    ): string {
        const o = Math.round(Math.max(0, Math.min(1, a)) * 1000) / 1000;
        const hit = cache.get(o);
        if (hit !== undefined) return hit;
        const str = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${o})`;
        cache.set(o, str);
        return str;
    }

    private rgba(a: number): string {
        return SkillOrbitEngine.tint(this.palette.accent, this.accentCache, a);
    }

    private ice(a: number): string {
        return SkillOrbitEngine.tint(this.palette.ice, this.iceCache, a);
    }

    private muted(a: number): string {
        return SkillOrbitEngine.tint(this.palette.muted, this.mutedCache, a);
    }

    /* ── One glow, drawn many times ──
       `createRadialGradient` was called once per star anchor and once per
       focused body, EVERY FRAME — up to 33 gradient objects and 66
       `addColorStop` calls a frame. The atlas hit this same wall and its fix
       is the one used here (see `ensureCoreGradients`): build the gradient
       once at unit radius with a full-strength inner stop, then translate,
       scale and modulate it with `globalAlpha`.

       That is not an approximation. A stop of `accent@1` composited at
       `globalAlpha = 0.28` is `accent@0.28`, and the outer stop is fully
       transparent either way, so the two paths produce identical pixels. */
    private ensureGlow(): CanvasGradient {
        if (!this.unitGlow) {
            const g = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
            g.addColorStop(0, this.rgba(1));
            g.addColorStop(1, this.rgba(0));
            this.unitGlow = g;
        }
        return this.unitGlow;
    }

    private paintGlow(x: number, y: number, r: number, alpha: number): void {
        if (alpha <= 0.002 || r <= 0) return;
        const c = this.ctx;
        c.save();
        c.globalAlpha = alpha;
        c.translate(x, y);
        c.scale(r, r);
        c.fillStyle = this.ensureGlow();
        c.beginPath();
        c.arc(0, 0, 1, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }

    /**
     * Re-scale the backing store only. All geometry is in CSS px and the
     * context transform absorbs the ratio, so nothing else has to move.
     *
     * `force` is for `resize`, where width and height have already changed
     * and the early-out would be reading a stale box.
     */
    private applyBackingScale(force = false): void {
        const dpr =
            Math.min(
                window.devicePixelRatio || 1,
                DPR_CAP,
                dprCap(deviceTier()),
            ) * this.dprScale;
        if (!force && Math.abs(dpr - this.dpr) < 0.01) return;
        if (this.w < 1 || this.h < 1) return;
        this.dpr = dpr;
        this.canvas.width = Math.round(this.w * dpr);
        this.canvas.height = Math.round(this.h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Gradients are bound to the context state they were made in — the
        // same reason the atlas nulls `gradMode` when it rescales.
        this.unitGlow = null;
    }

    /** Apply a level the budget has just moved to. Rare — held for seconds. */
    private applyLevel(): void {
        const level = this.budget.level;
        if (level === this.appliedLevel) return;
        this.appliedLevel = level;

        const scale = LEVEL_SCALE[Math.min(level, LEVEL_SCALE.length - 1)];
        if (scale === this.dprScale) return;
        this.dprScale = scale;
        this.applyBackingScale();
        /* The starfield is rasterised AT this.dpr into its own canvas, so a
           scale change that skipped it would blit a mismatched bitmap and the
           stars would go soft or crunchy against a field that had not. */
        this.buildStars();
    }

    resize(w: number, h: number): void {
        if (w < 1 || h < 1) return;
        // Idempotent, so callers can offer a size as often as they like —
        // `ensureSized` in the component leans on this.
        if (Math.abs(w - this.w) < 0.5 && Math.abs(h - this.h) < 0.5) return;
        this.w = w;
        this.h = h;
        /* Through the shared helper, NOT a fresh `Math.min` — this used to
           recompute the ratio from scratch, so any resize while degraded
           silently threw the backing-store reduction away and handed a
           struggling machine full-resolution pixels again. */
        this.applyBackingScale(true);

        this.resolve();
        this.buildStars();

        /* First layout only: drop every body straight onto its orbit rather
           than letting it fly in from 0,0. A resize keeps positions and lets
           the walk absorb the change. */
        if (!this.seeded) {
            this.seeded = true;
            this.orbits.forEach((o) => {
                const a = this.anchorById.get(o.anchorId);
                if (!a) return;
                const p = positionAt(o, a, 0);
                this.bodies[o.skill].x = p.x;
                this.bodies[o.skill].y = p.y;
            });
        }
    }

    private resolve(): void {
        const s = solve(this.mode, { w: this.w, h: this.h });
        this.anchors = s.anchors;
        this.orbits = s.orbits;
        this.anchorById = new Map(s.anchors.map((a) => [a.id, a]));
    }

    setMode(mode: ViewMode): void {
        if (mode.mode === this.mode.mode &&
            (mode.mode === "category" ||
                (this.mode.mode === "project" && mode.projectId === this.mode.projectId))) {
            return;
        }
        this.mode = mode;
        this.selected = -1;
        this.resolve();

        this.wormhole = WORMHOLE_S;
        const focus = this.anchors[0];
        this.wormholeAt = focus ? { x: focus.x, y: focus.y } : null;

        if (this.reduced) this.drawStatic();
    }

    getMode(): ViewMode {
        return this.mode;
    }

    setPointer(x: number | null, y: number | null): void {
        this.pointer = x === null || y === null ? null : { x, y };
    }

    /** Nearest body within HIT_RADIUS, or -1. */
    hitTest(x: number, y: number): number {
        let best = -1;
        let bestD = HIT_RADIUS;
        for (let i = 0; i < this.bodies.length; i++) {
            const d = Math.hypot(this.bodies[i].x - x, this.bodies[i].y - y);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }

    /** Anchor under the point, or null — lets the star itself be clickable. */
    hitAnchor(x: number, y: number): Anchor | null {
        for (const a of this.anchors) {
            if (Math.hypot(a.x - x, a.y - y) < 34) return a;
        }
        return null;
    }

    beginDrag(i: number): void {
        if (i < 0 || this.reduced) return;
        this.dragging = i;
        this.bodies[i].state = "drag";
    }

    moveDrag(x: number, y: number): void {
        const i = this.dragging;
        if (i < 0) return;
        const b = this.bodies[i];
        b.vx = (x - b.x) * 12;
        b.vy = (y - b.y) * 12;
        b.x = x;
        b.y = y;
    }

    endDrag(): void {
        const i = this.dragging;
        if (i < 0) return;
        const b = this.bodies[i];

        /* Clamp the launch. `moveDrag` derives velocity from the pointer delta
           × 12 with no ceiling, so a flick of the wrist produced 1500+ px/s
           and, under the old friction, a 10,000px trajectory. */
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > MAX_FLING) {
            const s = MAX_FLING / speed;
            b.vx *= s;
            b.vy *= s;
        }

        b.state = "free";
        b.freeT = 0;
        b.offT = 0;
        this.dragging = -1;
    }

    select(i: number): void {
        this.selected = i;
        if (this.reduced) this.drawStatic();
    }

    getSelected(): number {
        return this.selected;
    }

    /** Screen position of a body — the readout panel anchors to it. */
    bodyPos(i: number): { x: number; y: number } | null {
        const b = this.bodies[i];
        return b ? { x: b.x, y: b.y } : null;
    }

    step(nowMs: number): void {
        if (this.reduced) return;
        const now = nowMs / 1000;
        /* Return rather than fall through with dt = 0. The first frame after
           a `resetClock()` has no previous timestamp to measure against, and
           feeding that non-measurement to the budget below would be a free
           0ms sample every time this section comes back on screen. */
        if (!this.last) {
            this.last = now;
            return;
        }

        const rawMs = (now - this.last) * 1000;
        this.last = now;

        /* ── The reactive half of the device tier ──────────
           `#stack` is the one region where the atlas stands down and this is
           the sole animating canvas, so before this existed it was also the
           one region with nothing watching the frame rate. See
           lib/frameBudget.ts. */
        this.budget = advance(this.budget, rawMs, nowMs, MAX_PERF_LEVEL);
        if (this.budget.level !== this.appliedLevel) this.applyLevel();

        // Clamped so a stalled tab cannot teleport everything on resume.
        this.renderAccum += Math.min(rawMs / 1000, 0.05);

        /* Level 1+: draw at ~30fps. The accumulator is what makes this a
           lower frame rate rather than slow motion — `update` below still
           receives every millisecond that has passed, just in bigger steps. */
        if (this.budget.level >= 1 && this.renderAccum < 1 / 32) return;

        const dt = Math.min(this.renderAccum, 0.05);
        this.renderAccum = 0;

        this.t += dt;
        if (this.wormhole > 0) this.wormhole = Math.max(0, this.wormhole - dt);

        this.update(dt);
        this.draw();
    }

    private update(dt: number): void {
        // Frame-rate compensated exponential approach.
        const k = 1 - Math.pow(1 - FOLLOW, dt * 60);

        for (const o of this.orbits) {
            const b = this.bodies[o.skill];
            const a = this.anchorById.get(o.anchorId);
            if (!a) continue;

            b.lit += ((o.lit ? 1 : 0.22) - b.lit) * k;

            if (b.state === "drag") continue;

            const p = positionAt(o, a, this.t);

            if (b.state === "free") {
                const decay = Math.pow(DRAG_DECAY, dt);
                b.vx *= decay;
                b.vy *= decay;
                b.x += b.vx * dt;
                b.y += b.vy * dt;

                b.freeT += dt;
                /* Off the panel entirely? Then it is invisible, and running
                   out the full free-flight budget just reads as having lost
                   it. The clock only accumulates while it is actually out. */
                const outside =
                    b.x < 0 || b.y < 0 || b.x > this.w || b.y > this.h;
                b.offT = outside ? b.offT + dt : 0;

                /* A TIMER decides this now, not friction. Friction only
                   shapes the arc on the way out. */
                if (flightPhase(b.freeT, b.offT) === "return") {
                    b.state = "return";
                    b.retT = 0;
                    b.retX = b.x;
                    b.retY = b.y;
                }
                continue;
            }

            if (b.state === "return") {
                b.retT = Math.min(1, b.retT + dt / RETURN_S);
                const e = easeReturn(b.retT);
                /* From a fixed release point toward a MOVING target, so the
                   body curves in as its slot travels — a straight line to a
                   stale point would arrive somewhere the orbit has left. */
                b.x = b.retX + (p.x - b.retX) * e;
                b.y = b.retY + (p.y - b.retY) * e;
                if (b.retT >= 1) {
                    b.state = "orbit";
                    b.vx = 0;
                    b.vy = 0;
                }
                continue;
            }

            b.x += (p.x - b.x) * k;
            b.y += (p.y - b.y) * k;
        }

        // Label focus by pointer proximity, plus whatever is selected.
        for (let i = 0; i < this.bodies.length; i++) {
            const b = this.bodies[i];
            let want = 0;
            if (this.pointer) {
                const d = Math.hypot(b.x - this.pointer.x, b.y - this.pointer.y);
                want = Math.max(0, 1 - d / LABEL_RADIUS);
            }
            if (i === this.selected || i === this.dragging) want = 1;
            b.focus += (want - b.focus) * (1 - Math.pow(1 - 0.14, dt * 60));
        }
    }

    /* ── Starfield ─────────────────────────────────────
       Rendered once to an offscreen canvas and blitted with a small
       pointer-driven offset. Drawing 140 stars per frame is affordable but
       pointless — they never change, only their offset does. */
    private buildStars(): void {
        const pad = 40;
        const c = document.createElement("canvas");
        c.width = Math.round((this.w + pad * 2) * this.dpr);
        c.height = Math.round((this.h + pad * 2) * this.dpr);
        const g = c.getContext("2d");
        if (!g) return;
        g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        for (let i = 0; i < STAR_COUNT; i++) {
            const x = h(i, 1) * (this.w + pad * 2);
            const y = h(i, 2) * (this.h + pad * 2);
            const depth = h(i, 3);
            const r = 0.4 + depth * 1.0;
            g.globalAlpha = 0.12 + depth * 0.4;
            /* `#e6ded2` — a warm off-white — survived here from the
               amber-on-near-black scheme the site replaced. Every other
               surface is on the blue ramp, so one warm starfield read as a
               rendering fault rather than as a choice. */
            g.fillStyle = depth > 0.85 ? this.rgba(0.9) : this.ice(1);
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
        }
        this.stars = c;
    }

    private drawStars(): void {
        if (!this.stars) return;
        const pad = 40;
        let ox = 0;
        let oy = 0;
        if (this.pointer) {
            ox = (this.pointer.x / this.w - 0.5) * -16;
            oy = (this.pointer.y / this.h - 0.5) * -16;
        }
        this.ctx.drawImage(
            this.stars,
            -pad + ox,
            -pad + oy,
            this.w + pad * 2,
            this.h + pad * 2,
        );
    }

    private draw(): void {
        const c = this.ctx;
        c.clearRect(0, 0, this.w, this.h);
        this.drawStars();

        // Orbit rings — faint, so the structure reads even where no body is.
        c.lineWidth = 1;
        const seen = this.seenOrbits;
        seen.clear();
        for (const o of this.orbits) {
            const a = this.anchorById.get(o.anchorId);
            if (!a) continue;
            const key = `${o.anchorId}:${Math.round(o.radius)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            c.strokeStyle = this.rgba(o.lit ? 0.07 : 0.03);
            c.beginPath();
            c.arc(a.x, a.y, o.radius, 0, Math.PI * 2);
            c.stroke();
        }

        this.drawAnchors();
        this.drawBodies();
        if (this.wormhole > 0) this.drawWormhole();
    }

    private drawAnchors(): void {
        const c = this.ctx;
        c.font = this.fontAnchor;
        c.textAlign = "center";
        c.textBaseline = "top";
        for (const a of this.anchors) {
            /* Sized from the system, not a constant. A fixed 46px glow was
               drawn while radii varied from 67 to 112: it swamped the small
               systems, and on a narrow panel the biggest system's inner ring
               fell inside its own star's halo — which is what read as mud
               around Machine Learning. */
            this.paintGlow(a.x, a.y, glowRadius(a.radius), 0.28);

            c.fillStyle = this.rgba(0.95);
            c.beginPath();
            c.arc(a.x, a.y, a.kind === "project" ? 5.5 : 4, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = this.ice(0.82);
            c.fillText(a.label.toUpperCase(), a.x, a.y + 14);
        }
    }

    private drawBodies(): void {
        const c = this.ctx;
        c.textAlign = "center";
        c.textBaseline = "bottom";

        for (let i = 0; i < this.bodies.length; i++) {
            const b = this.bodies[i];
            const r = 2.6 + b.focus * 2.2;

            this.paintGlow(b.x, b.y, 18, 0.3 * b.focus * b.lit);

            c.fillStyle =
                b.lit > 0.5
                    ? this.rgba(0.55 + b.focus * 0.45)
                    : this.muted(0.35 + b.focus * 0.3);
            c.beginPath();
            c.arc(b.x, b.y, r, 0, Math.PI * 2);
            c.fill();

            if (b.focus > 0.04) {
                c.font = this.fontBody;
                c.fillStyle = this.ice(b.focus * b.lit);
                c.fillText(SKILLS[i].name, b.x, b.y - r - 6);
            }
        }
    }

    /** One expanding ring. The bodies are already travelling on their own. */
    private drawWormhole(): void {
        const at = this.wormholeAt;
        if (!at) return;
        const p = 1 - this.wormhole / WORMHOLE_S;
        const c = this.ctx;
        const max = Math.max(this.w, this.h) * 0.7;

        c.save();
        c.lineWidth = 2 - p * 1.4;
        c.strokeStyle = this.rgba((1 - p) * 0.5);
        c.beginPath();
        c.arc(at.x, at.y, p * max, 0, Math.PI * 2);
        c.stroke();

        c.lineWidth = 1;
        c.strokeStyle = this.rgba((1 - p) * 0.22);
        c.beginPath();
        c.arc(at.x, at.y, p * max * 0.72, 0, Math.PI * 2);
        c.stroke();
        c.restore();
    }

    /** One frame, orbits at rest. The reduced-motion path. */
    drawStatic(): void {
        this.orbits.forEach((o) => {
            const a = this.anchorById.get(o.anchorId);
            if (!a) return;
            const p = positionAt(o, a, 0);
            const b = this.bodies[o.skill];
            b.x = p.x;
            b.y = p.y;
            b.lit = o.lit ? 1 : 0.22;
            b.focus = o.skill === this.selected ? 1 : 0;
        });
        this.draw();
    }

    /** Reset the clock so the first frame back does not see the whole pause. */
    resetClock(): void {
        this.last = 0;
        /* Cleared with it, or the first frame back draws with whatever was
           banked when the section left the screen. */
        this.renderAccum = 0;
    }
}
