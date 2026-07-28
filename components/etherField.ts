/* ══════════════════════════════════════════════════════
   Ether Field — Monochrome Noise Depth Layer
   
   A very slow, restrained noise field that adds
   environmental depth behind all content. Inspired by
   React Bits' Liquid Ether, but rewritten as a pure
   Canvas 2D module driven by BackgroundAtmosphere's
   existing RAF loop.

   Key design decisions:
   - Offscreen canvas at ¼ resolution for performance
   - Pure simplex2D noise — no WebGL context
   - Monochrome only (white luminosity on #050505)
   - Opacity ceiling 0.03 — almost subconscious
   - Pointer reactivity reads --mouse-x/--mouse-y
     CSS vars set by CursorGlow (zero new listeners)
   - No independent RAF, resize, or visibility handlers

   Usage:
     const ether = new EtherField(onscreenCanvas);
     // In your existing RAF loop:
     ether.resize(cssWidth, cssHeight);
     ether.update(dt, mouseX, mouseY);
     ether.draw(ctx);  // composites onto the onscreen ctx
   ══════════════════════════════════════════════════════ */

// ── Simplex 2D Noise ──────────────────────────────────
// Compact implementation of simplex noise in 2D.
// Produces smooth, non-repeating organic patterns.

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

// Permutation table (doubled to avoid index wrapping)
const PERM = new Uint8Array(512);
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// Seed the permutation table deterministically
(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates with fixed seed
  let seed = 42;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647;
    const j = seed % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function simplex2(x: number, y: number): number {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;

  let i1: number, j1: number;
  if (x0 > y0) { i1 = 1; j1 = 0; }
  else { i1 = 0; j1 = 1; }

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  const ii = i & 255;
  const jj = j & 255;

  let n0 = 0, n1 = 0, n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) {
    t0 *= t0;
    const gi0 = PERM[ii + PERM[jj]] & 7;
    n0 = t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) {
    t1 *= t1;
    const gi1 = PERM[ii + i1 + PERM[jj + j1]] & 7;
    n1 = t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) {
    t2 *= t2;
    const gi2 = PERM[ii + 1 + PERM[jj + 1]] & 7;
    n2 = t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2);
  }

  // Scale to [-1, 1]
  return 70 * (n0 + n1 + n2);
}

// ── Fractal Brownian Motion ───────────────────────────

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex2(x * frequency, y * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// ── Ether Field Engine ────────────────────────────────

/** Resolution divisor — renders at 1/SCALE_DIV of viewport size. */
const SCALE_DIV = 6;

/** Noise sampling frequency — lower = larger, smoother blobs. */
const NOISE_SCALE = 1.8;

/** Time multiplier — how fast the field evolves. Very slow. */
const TIME_SPEED = 0.018;

/** Maximum output opacity. Kept extremely low for subtlety. */
const MAX_OPACITY = 0.028;

/** Pointer influence radius (fraction of viewport diagonal). */
const POINTER_RADIUS = 0.22;

/** Maximum pointer-induced brightness boost. */
const POINTER_BOOST = 0.012;

export class EtherField {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private imageData: ImageData | null = null;
  private buf: Uint8ClampedArray | null = null;

  private ow = 0;
  private oh = 0;
  private viewW = 0;
  private viewH = 0;

  private time = 0;

  /** Smoothed pointer position (0-1 normalized). */
  private pointerX = 0.5;
  private pointerY = 0.5;

  constructor() {
    this.offscreen = document.createElement("canvas");
    const ctx = this.offscreen.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("EtherField: cannot get 2D context");
    this.offCtx = ctx;
  }

  /** Call when the viewport resizes. Reallocates the offscreen buffer. */
  resize(cssWidth: number, cssHeight: number): void {
    if (cssWidth < 1 || cssHeight < 1) return;

    const ow = Math.max(1, Math.ceil(cssWidth / SCALE_DIV));
    const oh = Math.max(1, Math.ceil(cssHeight / SCALE_DIV));

    if (ow === this.ow && oh === this.oh) return;

    this.ow = ow;
    this.oh = oh;
    this.viewW = cssWidth;
    this.viewH = cssHeight;

    this.offscreen.width = ow;
    this.offscreen.height = oh;
    this.imageData = this.offCtx.createImageData(ow, oh);
    this.buf = this.imageData.data;
  }

  /** Advance time and recompute the noise field. Call once per RAF tick.
   *  mouseX/mouseY are in CSS pixels (clientX/clientY). */
  update(dt: number, mouseX: number, mouseY: number): void {
    this.time += dt * TIME_SPEED;

    // Smooth pointer interpolation (no React state, no re-render)
    const targetPX = this.viewW > 0 ? mouseX / this.viewW : 0.5;
    const targetPY = this.viewH > 0 ? mouseY / this.viewH : 0.5;
    this.pointerX += (targetPX - this.pointerX) * 0.03;
    this.pointerY += (targetPY - this.pointerY) * 0.03;

    if (!this.buf || !this.imageData) return;

    const { ow, oh, buf, time } = this;
    const px = this.pointerX;
    const py = this.pointerY;
    const diag = Math.sqrt(ow * ow + oh * oh);
    const pointerR = POINTER_RADIUS * diag;
    const pointerR2 = pointerR * pointerR;
    const pointerPixelX = px * ow;
    const pointerPixelY = py * oh;

    for (let y = 0; y < oh; y++) {
      const ny = y / oh;
      for (let x = 0; x < ow; x++) {
        const nx = x / ow;

        // Multi-octave noise with slow time evolution
        const n1 = fbm(nx * NOISE_SCALE + time, ny * NOISE_SCALE + time * 0.7, 3);
        const n2 = fbm(
          nx * NOISE_SCALE * 0.5 + time * 0.5 + 4.3,
          ny * NOISE_SCALE * 0.5 + time * 0.3 + 2.7,
          2,
        );

        // Combine: n1 provides structure, n2 provides slow modulation
        let value = (n1 * 0.65 + n2 * 0.35);
        // Remap from [-1,1] to [0,1]
        value = value * 0.5 + 0.5;

        // Apply vignette — fade at edges so the ether doesn't
        // create hard boundaries against the viewport edge
        const vx = (nx - 0.5) * 2; // -1 to 1
        const vy = (ny - 0.5) * 2;
        const vignette = 1.0 - Math.min(1, (vx * vx + vy * vy) * 0.55);

        value *= vignette;

        // Subtle pointer-reactive brightness
        const dx = x - pointerPixelX;
        const dy = y - pointerPixelY;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < pointerR2) {
          const proximity = 1 - Math.sqrt(dist2) / pointerR;
          // Smooth falloff
          const boost = proximity * proximity * POINTER_BOOST;
          value += boost / MAX_OPACITY;
        }

        // Final luminance (white channel only — monochrome)
        const lum = Math.max(0, Math.min(255, value * MAX_OPACITY * 255));

        const i = (y * ow + x) * 4;
        buf[i] = 255;     // R — white
        buf[i + 1] = 255; // G
        buf[i + 2] = 255; // B
        buf[i + 3] = lum; // A — this is the only channel that varies
      }
    }

    this.offCtx.putImageData(this.imageData, 0, 0);
  }

  /** Composite the ether field onto the provided onscreen context.
   *  Should be called FIRST in the draw order (behind everything). */
  draw(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    if (this.ow < 1 || this.oh < 1) return;
    // Draw the tiny offscreen canvas stretched to full viewport.
    // The browser's bilinear interpolation gives us free smoothing.
    ctx.drawImage(this.offscreen, 0, 0, viewW, viewH);
  }

  /** Render a single static frame (for prefers-reduced-motion). */
  drawStatic(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    // Render one frame at t=0 with centered pointer
    this.time = 0;
    this.pointerX = 0.5;
    this.pointerY = 0.5;
    this.update(0, viewW / 2, viewH / 2);
    this.draw(ctx, viewW, viewH);
  }
}
