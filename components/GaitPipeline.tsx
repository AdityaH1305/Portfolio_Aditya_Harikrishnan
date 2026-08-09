"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   GaitPipeline — the preprocessing pipeline, computed live

   Every image on the right-hand side of this canvas is
   calculated in the browser from the three published CASIA-B
   silhouettes: the centroid and bounding box are measured
   from actual pixels, the set max-pool is a real per-pixel
   max, the aggregate template a real per-pixel mean. Nothing
   here is a pre-rendered picture of a result.

   HONESTY NOTE, which the copy also states: the three
   samples are three walking CONDITIONS (normal, coat, bag),
   not consecutive frames of one walk. Set max-pooling is
   permutation-invariant, so applying it to any set is
   faithful. A true GEI/GEnI averages within a single
   sequence — so the last stage is labelled "aggregate
   template", not GEI. Calling it a GEI would be a nicer
   caption and a false one.

   The silhouettes are 64×64 and drawn at ~2-3x, so
   imageSmoothingEnabled stays off throughout: this is the
   model's real input resolution and blurring it would
   misrepresent it.
   ══════════════════════════════════════════════════════ */

const SRC = ["/gait/normal.png", "/gait/coat.png", "/gait/bag.png"];
const COND = ["NM · normal", "CL · coat", "BG · bag"];
const N = 64;

/* Logical drawing space. The canvas is scaled to fit its container, so
   every coordinate below is resolution-independent. */
const W = 760;
const H = 430;
const IN_SIZE = 96;
const IN_GAP = 28;
const IN_Y = 54;
const OUT_SIZE = 168;
const OUT_Y = 218;

const STAGES = [
    {
        title: "The set",
        body: "A walk arrives as an unordered set of silhouettes. No frame ordering is assumed, so dropped frames and variable walking speed cost nothing.",
    },
    {
        title: "Centroid alignment",
        body: "The centroid of the foreground mask is measured and the crop is centred on it, so the subject sits in the same place regardless of where they were in frame.",
    },
    {
        title: "64 × 64 normalisation",
        body: "Every silhouette is scaled to a uniform 64×64 grid. This is the model's real input resolution — the pixelation below is the data, not the rendering.",
    },
    {
        title: "Symmetric set pooling",
        body: "A per-pixel max across the set. Because max is order-independent, the same output falls out for any permutation of the input — that is what makes the representation permutation-invariant.",
    },
    {
        title: "Aggregate template",
        body: "A per-pixel mean over the set. In the full pipeline this operation runs across one subject's walk sequence to build the Gait Energy Image; here it runs over the three published condition samples.",
    },
];

type Gray = Uint8ClampedArray;

interface Frame {
    gray: Gray;
    cx: number;
    cy: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

/** Foreground centroid and bounding box, measured from the mask. */
function analyse(gray: Gray): Omit<Frame, "gray"> {
    let sx = 0,
        sy = 0,
        n = 0;
    let minX = N,
        maxX = -1,
        minY = N,
        maxY = -1;

    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            if (gray[y * N + x] <= 40) continue;
            sx += x;
            sy += y;
            n++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    if (n === 0) return { cx: N / 2, cy: N / 2, minX: 0, maxX: N, minY: 0, maxY: N };
    return { cx: sx / n, cy: sy / n, minX, maxX, minY, maxY };
}

/** Paint a grayscale mask into an offscreen canvas, tinted, alpha = intensity. */
function toCanvas(gray: Gray, rgb: [number, number, number]): HTMLCanvasElement {
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
        img.data[i * 4] = rgb[0];
        img.data[i * 4 + 1] = rgb[1];
        img.data[i * 4 + 2] = rgb[2];
        img.data[i * 4 + 3] = gray[i];
    }
    ctx.putImageData(img, 0, 0);
    return c;
}

export default function GaitPipeline() {
    const wrapRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const framesRef = useRef<Frame[] | null>(null);
    const inputCanvases = useRef<HTMLCanvasElement[]>([]);
    const pooledCanvas = useRef<HTMLCanvasElement | null>(null);
    const meanCanvas = useRef<HTMLCanvasElement | null>(null);
    const accentRef = useRef<[number, number, number]>([34, 211, 238]);

    const progress = useRef(0);
    const [stage, setStage] = useState(0);
    const [ready, setReady] = useState(false);

    /* ── Draw ───────────────────────────────────────────── */
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const frames = framesRef.current;
        if (!canvas || !frames) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth;
        const cssH = (cssW * H) / W;
        if (canvas.width !== Math.round(cssW * dpr)) {
            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);
        }

        const s = (cssW * dpr) / W;
        ctx.setTransform(s, 0, 0, s, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = false;

        const p = progress.current;
        const [ar, ag, ab] = accentRef.current;
        const accent = `rgb(${ar}, ${ag}, ${ab})`;

        const groupW = 3 * IN_SIZE + 2 * IN_GAP;
        const startX = (W - groupW) / 2;

        /* ── The input set ── */
        frames.forEach((f, i) => {
            const x = startX + i * (IN_SIZE + IN_GAP);

            ctx.globalAlpha = 1;
            ctx.strokeStyle = "rgba(148,163,184,0.18)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 0.5, IN_Y - 0.5, IN_SIZE + 1, IN_SIZE + 1);

            ctx.drawImage(inputCanvases.current[i], x, IN_Y, IN_SIZE, IN_SIZE);

            // Condition label
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = "rgb(120,136,155)";
            ctx.font =
                "500 10px ui-monospace, 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.fillText(COND[i], x + IN_SIZE / 2, IN_Y + IN_SIZE + 16);

            const px = IN_SIZE / N; // logical px per source pixel

            /* Stage 1 — measured centroid + bounding box */
            if (p > 0.05) {
                const a = Math.min(1, (p - 0.05) / 0.6) * (p < 2 ? 1 : Math.max(0, 1 - (p - 2)));
                if (a > 0.01) {
                    ctx.globalAlpha = a;
                    ctx.strokeStyle = accent;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(
                        x + f.minX * px,
                        IN_Y + f.minY * px,
                        (f.maxX - f.minX + 1) * px,
                        (f.maxY - f.minY + 1) * px,
                    );

                    const cxp = x + f.cx * px;
                    const cyp = IN_Y + f.cy * px;
                    ctx.beginPath();
                    ctx.moveTo(cxp - 7, cyp);
                    ctx.lineTo(cxp + 7, cyp);
                    ctx.moveTo(cxp, cyp - 7);
                    ctx.lineTo(cxp, cyp + 7);
                    ctx.stroke();

                    ctx.fillStyle = accent;
                    ctx.font = "500 9px ui-monospace, monospace";
                    ctx.fillText(
                        `(${f.cx.toFixed(1)}, ${f.cy.toFixed(1)})`,
                        x + IN_SIZE / 2,
                        IN_Y - 8,
                    );
                }
            }

            /* Stage 2 — the 64×64 sampling grid */
            if (p > 1.05) {
                const a = Math.min(1, (p - 1.05) / 0.6) * Math.max(0, 1 - Math.max(0, p - 3));
                if (a > 0.01) {
                    ctx.globalAlpha = a * 0.5;
                    ctx.strokeStyle = "rgba(148,163,184,0.55)";
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    for (let g = 8; g < N; g += 8) {
                        ctx.moveTo(x + g * px, IN_Y);
                        ctx.lineTo(x + g * px, IN_Y + IN_SIZE);
                        ctx.moveTo(x, IN_Y + g * px);
                        ctx.lineTo(x + IN_SIZE, IN_Y + g * px);
                    }
                    ctx.stroke();
                }
            }
        });

        /* ── The pooled / aggregate output ── */
        if (p > 2.05) {
            const a = Math.min(1, (p - 2.05) / 0.5);
            const useMean = p >= 3.5;
            const src = useMean ? meanCanvas.current : pooledCanvas.current;
            if (src) {
                const ox = (W - OUT_SIZE) / 2;

                // Converging lines from each input into the output
                ctx.globalAlpha = a * 0.35;
                ctx.strokeStyle = accent;
                ctx.lineWidth = 1;
                ctx.beginPath();
                frames.forEach((_, i) => {
                    const x = startX + i * (IN_SIZE + IN_GAP) + IN_SIZE / 2;
                    ctx.moveTo(x, IN_Y + IN_SIZE + 24);
                    ctx.lineTo(W / 2, OUT_Y - 14);
                });
                ctx.stroke();

                ctx.globalAlpha = a;
                ctx.strokeStyle = "rgba(148,163,184,0.28)";
                ctx.strokeRect(
                    ox - 0.5,
                    OUT_Y - 0.5,
                    OUT_SIZE + 1,
                    OUT_SIZE + 1,
                );
                ctx.drawImage(src, ox, OUT_Y, OUT_SIZE, OUT_SIZE);

                ctx.fillStyle = accent;
                ctx.font = "500 10px ui-monospace, monospace";
                ctx.textAlign = "center";
                ctx.fillText(
                    useMean ? "per-pixel mean" : "per-pixel max",
                    W / 2,
                    OUT_Y + OUT_SIZE + 18,
                );
            }
        }

        ctx.globalAlpha = 1;
    }, []);

    /* ── Load and precompute ────────────────────────────── */
    useEffect(() => {
        let cancelled = false;

        const accentVar = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent-rgb")
            .trim();
        if (accentVar) {
            const parts = accentVar.split(/[\s,]+/).map(Number);
            if (parts.length === 3 && parts.every((v) => !Number.isNaN(v))) {
                accentRef.current = parts as [number, number, number];
            }
        }

        Promise.all(
            SRC.map(
                (src) =>
                    new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = reject;
                        img.src = src;
                    }),
            ),
        )
            .then((imgs) => {
                if (cancelled) return;

                const scratch = document.createElement("canvas");
                scratch.width = N;
                scratch.height = N;
                const sctx = scratch.getContext("2d", {
                    willReadFrequently: true,
                })!;

                const grays: Gray[] = imgs.map((img) => {
                    sctx.clearRect(0, 0, N, N);
                    sctx.drawImage(img, 0, 0, N, N);
                    const d = sctx.getImageData(0, 0, N, N).data;
                    const g = new Uint8ClampedArray(N * N);
                    for (let i = 0; i < N * N; i++) {
                        // Sources are binary masks; luminance of any channel
                        // works, but weight properly in case of antialiasing.
                        g[i] =
                            0.299 * d[i * 4] +
                            0.587 * d[i * 4 + 1] +
                            0.114 * d[i * 4 + 2];
                    }
                    return g;
                });

                framesRef.current = grays.map((g) => ({
                    gray: g,
                    ...analyse(g),
                }));

                inputCanvases.current = grays.map((g) =>
                    toCanvas(g, [232, 237, 242]),
                );

                // Real per-pixel max and mean across the set.
                const pooled = new Uint8ClampedArray(N * N);
                const mean = new Uint8ClampedArray(N * N);
                for (let i = 0; i < N * N; i++) {
                    let m = 0;
                    let sum = 0;
                    for (const g of grays) {
                        if (g[i] > m) m = g[i];
                        sum += g[i];
                    }
                    pooled[i] = m;
                    mean[i] = sum / grays.length;
                }
                pooledCanvas.current = toCanvas(pooled, accentRef.current);
                meanCanvas.current = toCanvas(mean, accentRef.current);

                setReady(true);
                draw();
            })
            .catch(() => {
                /* A failed decode leaves `ready` false, which keeps the
                   static fallback copy on screen. */
            });

        return () => {
            cancelled = true;
        };
    }, [draw]);

    /* ── Scroll driver ──────────────────────────────────── */
    useGSAP(
        () => {
            if (!ready) return;

            const mm = gsap.matchMedia();

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                /* Trigger on the GRID, not the whole section. The section
                   includes the heading above it, which pushed the scrub range
                   out of step with the sticky travel — the last stages landed
                   after the panel had already unstuck. */
                const st = ScrollTrigger.create({
                    trigger: gridRef.current,
                    start: "top 20%",
                    end: "bottom 80%",
                    scrub: true,
                    onUpdate: (self) => {
                        progress.current = self.progress * (STAGES.length - 1);
                        setStage(
                            Math.min(
                                STAGES.length - 1,
                                Math.round(progress.current),
                            ),
                        );
                        // Written straight to the DOM: this fires every
                        // frame, and a setState per frame would re-render
                        // the whole stage list for a 1px bar.
                        if (barRef.current) {
                            barRef.current.style.transform = `scaleX(${self.progress})`;
                        }
                        draw();
                    },
                });
                return () => st.kill();
            });

            /* Reduced motion: render the final state once, no scroll
               coupling, and let the caption list stand on its own. */
            mm.add("(prefers-reduced-motion: reduce)", () => {
                progress.current = STAGES.length - 1;
                setStage(STAGES.length - 1);
                if (barRef.current) barRef.current.style.transform = "scaleX(1)";
                draw();
            });

            return () => mm.revert();
        },
        { dependencies: [ready, draw] },
    );

    /* Redraw on resize — the canvas backing store is sized from clientWidth. */
    useEffect(() => {
        if (!ready) return;
        const onResize = () => draw();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [ready, draw]);

    return (
        <div ref={wrapRef} className="section-container">
            <div>
                <p className="label">Interactive</p>
                <h2 className="heading-md mt-3">Preprocessing, step by step</h2>
                <p className="body-sm mt-4 measure">
                    Scroll to advance. Every derived image is computed in your
                    browser from the three published CASIA-B silhouettes —
                    the centroid and bounding box are measured from the actual
                    mask, and the pooled outputs are real per-pixel operations.
                </p>
            </div>

            {/* `items-start` is load-bearing. A grid item defaults to
                align-self: stretch, which makes the sticky column exactly as
                tall as the row — and a sticky element with no room to move
                inside its container never moves at all.

                Not wrapped in Reveal for the same reason: as a stretched grid
                item it would lose its travel again. */}
            <div
                ref={gridRef}
                className="mt-10 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16 items-start"
            >
                {/* Sticky at every width. The stage list is far taller than
                    the canvas, so without this the diagram scrolled out of
                    view around stage 3 and the reader was watching prose
                    describe something no longer on screen.

                    top-20 clears the route header, which is itself sticky at
                    top-0 and 56–64px tall. */}
                <div className="sticky top-20 lg:top-24 self-start">
                    <div className="shell-bezel">
                        <div className="core-bezel overflow-hidden p-3">
                            <canvas
                                ref={canvasRef}
                                data-cursor="probe"
                                className="w-full block"
                                style={{ aspectRatio: `${W} / ${H}` }}
                                role="img"
                                aria-label="Diagram of the gait preprocessing pipeline: three CASIA-B silhouettes with measured centroid and bounding box, a 64 by 64 sampling grid, and the per-pixel max and mean computed across the set."
                            />
                        </div>
                    </div>

                    {/* Progress + current stage, so the pinned panel says
                        what it is showing without the reader having to look
                        across at the list. */}
                    <div className="mt-4 flex items-center gap-4">
                        <span className="mono text-xs text-accent tabular-nums shrink-0">
                            {String(stage + 1).padStart(2, "0")}
                        </span>
                        <p className="text-sm text-primary shrink-0">
                            {STAGES[stage].title}
                        </p>
                        <div className="h-px flex-1 bg-edge overflow-hidden">
                            <div
                                ref={barRef}
                                className="h-full bg-accent origin-left"
                                style={{ transform: "scaleX(0)" }}
                            />
                        </div>
                        <span className="mono text-xs text-quaternary tabular-nums shrink-0">
                            {String(STAGES.length).padStart(2, "0")}
                        </span>
                    </div>
                </div>

                {/* Stage list. Doubles as the no-JS and reduced-motion
                    fallback: the whole explanation is readable as text even
                    if the canvas never paints. */}
                <ol className="border-t border-edge">
                    {STAGES.map((s, i) => (
                        <li
                            key={s.title}
                            className={`py-4 border-b border-edge transition-opacity duration-500 ${
                                i === stage ? "opacity-100" : "opacity-45"
                            }`}
                        >
                            <div className="flex items-baseline gap-3">
                                <span
                                    className={`mono text-xs tabular-nums transition-colors duration-500 ${
                                        i === stage
                                            ? "text-accent"
                                            : "text-quaternary"
                                    }`}
                                >
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-primary">
                                        {s.title}
                                    </p>
                                    <p className="body-sm mt-1.5">{s.body}</p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}
