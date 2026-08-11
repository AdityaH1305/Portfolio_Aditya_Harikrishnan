import { SKILLS } from "./data";
import {
    solve,
    positionAt,
    glowRadius,
    type Anchor,
    type Orbit,
    type ViewMode,
} from "./layout";

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
}

/** How fast a body closes on its target. Frame-rate compensated below. */
const FOLLOW = 0.075;
/** Velocity below which a flung body is recaptured, px/s. */
const RECAPTURE_BELOW = 40;
/** Free-flight decay per second. */
const DRAG_DECAY = 0.86;
/** Seconds the wormhole flourish lasts. Purely cosmetic; the walk is what moves bodies. */
const WORMHOLE_S = 0.9;
/** Label fades in within this distance of the pointer, px. */
const LABEL_RADIUS = 165;
/** Hit radius for a body, px — generous, these are small dots. */
export const HIT_RADIUS = 22;

const DPR_CAP = 1.5;
const STAR_COUNT = 140;

type BodyState = "orbit" | "drag" | "free";

interface Body {
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: BodyState;
    /** 0…1, eased. Drives label alpha and dot size. */
    focus: number;
    lit: number;
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

    private bodies: Body[] = SKILLS.map(() => ({
        x: 0, y: 0, vx: 0, vy: 0, state: "orbit", focus: 0, lit: 1,
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
    }

    private rgba(a: number): string {
        const [r, g, b] = this.palette.accent;
        return `rgba(${r},${g},${b},${a})`;
    }

    resize(w: number, h: number): void {
        if (w < 1 || h < 1) return;
        // Idempotent, so callers can offer a size as often as they like —
        // `ensureSized` in the component leans on this.
        if (Math.abs(w - this.w) < 0.5 && Math.abs(h - this.h) < 0.5) return;
        this.w = w;
        this.h = h;
        this.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
        this.canvas.width = Math.round(w * this.dpr);
        this.canvas.height = Math.round(h * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

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
        this.bodies[i].state = "free";
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
        if (!this.last) this.last = now;
        // Clamped so a stalled tab cannot teleport everything on resume.
        const dt = Math.min(now - this.last, 0.05);
        this.last = now;

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

            if (b.state === "free") {
                const decay = Math.pow(DRAG_DECAY, dt);
                b.vx *= decay;
                b.vy *= decay;
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                if (Math.hypot(b.vx, b.vy) < RECAPTURE_BELOW) b.state = "orbit";
                continue;
            }

            const p = positionAt(o, a, this.t);
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
            g.fillStyle = depth > 0.85 ? this.rgba(0.9) : "#cfd8e6";
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
        const seen = new Set<string>();
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
        for (const a of this.anchors) {
            /* Sized from the system, not a constant. A fixed 46px glow was
               drawn while radii varied from 67 to 112: it swamped the small
               systems, and on a narrow panel the biggest system's inner ring
               fell inside its own star's halo — which is what read as mud
               around Machine Learning. */
            const gr = glowRadius(a.radius);
            const glow = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, gr);
            glow.addColorStop(0, this.rgba(0.28));
            glow.addColorStop(1, this.rgba(0));
            c.fillStyle = glow;
            c.beginPath();
            c.arc(a.x, a.y, gr, 0, Math.PI * 2);
            c.fill();

            c.fillStyle = this.rgba(0.95);
            c.beginPath();
            c.arc(a.x, a.y, a.kind === "project" ? 5.5 : 4, 0, Math.PI * 2);
            c.fill();

            c.font = `600 11px var(--font-jetbrains-mono), ui-monospace, monospace`;
            c.textAlign = "center";
            c.textBaseline = "top";
            c.fillStyle = "rgba(232,237,242,0.82)";
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

            if (b.focus > 0.02) {
                const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, 18);
                g.addColorStop(0, this.rgba(0.3 * b.focus * b.lit));
                g.addColorStop(1, this.rgba(0));
                c.fillStyle = g;
                c.beginPath();
                c.arc(b.x, b.y, 18, 0, Math.PI * 2);
                c.fill();
            }

            c.fillStyle =
                b.lit > 0.5
                    ? this.rgba(0.55 + b.focus * 0.45)
                    : `rgba(120,136,155,${0.35 + b.focus * 0.3})`;
            c.beginPath();
            c.arc(b.x, b.y, r, 0, Math.PI * 2);
            c.fill();

            if (b.focus > 0.04) {
                c.font = `500 11px var(--font-jetbrains-mono), ui-monospace, monospace`;
                c.fillStyle = `rgba(232,237,242,${b.focus * b.lit})`;
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
    }
}
