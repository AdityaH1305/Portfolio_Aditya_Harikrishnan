"use client";

import { useEffect, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════════
   SignalField
   
   Ultra-subtle canvas-based infrastructure animation.
   Communicates: distributed systems, signal propagation,
   computational activity beneath the interface.
   
   Layers:
   1. Signal Traces — faint bezier paths traversing the viewport
   2. Node Pulses — sparse cyan heartbeats at trace endpoints
   3. Scroll-Responsive Density — activity shifts per section
   4. Orb Proximity — organic local density increase
   
   Performance::
   - Half-resolution canvas (dpr capped at 1.0)
   - ≤15 drawable elements per frame
   - Pre-allocated arrays, zero GC in render loop
   - Disabled on touch/mobile devices
   ══════════════════════════════════════════════════════ */

// ── Constants ──────────────────────────────────────────

const ACCENT = { r: 212, g: 175, b: 55 }; // gold #D4AF37

const MAX_TRACES = 8;
const MAX_PULSES = 5;

// Speed in normalized viewport units per second
const TRACE_SPEED_MIN = 0.008;
const TRACE_SPEED_MAX = 0.018;

const TRACE_OPACITY_MIN = 0.02;
const TRACE_OPACITY_MAX = 0.045;

const PULSE_OPACITY_MAX = 0.06;
const PULSE_RADIUS_MIN = 1.5;
const PULSE_RADIUS_MAX = 3;
const PULSE_LIFESPAN_MIN = 2.5; // seconds
const PULSE_LIFESPAN_MAX = 6.0;
const PULSE_SPAWN_INTERVAL_MIN = 2.0; // seconds between spawns
const PULSE_SPAWN_INTERVAL_MAX = 5.5;

// Scroll density map: [scrollPercent, densityMultiplier]
const DENSITY_MAP: [number, number][] = [
    [0.0, 0.55],   // Hero — calm
    [0.15, 0.7],   // About — moderate
    [0.35, 0.8],   // WhatIBuild
    [0.45, 1.0],   // Orb section — slightly elevated
    [0.60, 0.9],   // Featured Project
    [0.80, 0.65],  // Projects
    [1.0, 0.5],    // Contact — calm exit
];

// Orb section approximate scroll range (normalized 0–1)
const ORB_SCROLL_START = 0.38;
const ORB_SCROLL_END = 0.55;
const ORB_PROXIMITY_BOOST = 0.12; // ~12% pulse frequency increase

// ── Types ──────────────────────────────────────────────

interface Trace {
    /** Start point (normalized 0–1) */
    x0: number; y0: number;
    /** Control point */
    cx: number; cy: number;
    /** End point */
    x1: number; y1: number;
    /** Current progress 0→1 */
    progress: number;
    /** Speed (progress per second) */
    speed: number;
    /** Opacity at full density */
    baseOpacity: number;
    /** Line width */
    width: number;
    /** Is this trace currently alive? */
    alive: boolean;
}

interface Pulse {
    x: number; y: number;
    /** Current age in seconds */
    age: number;
    /** Total lifespan in seconds */
    lifespan: number;
    /** Radius at peak */
    maxRadius: number;
    /** Opacity at peak */
    maxOpacity: number;
    alive: boolean;
}

// ── Utility ────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function sampleDensity(scrollNorm: number): number {
    // Linearly interpolate through the density map
    for (let i = 0; i < DENSITY_MAP.length - 1; i++) {
        const [s0, d0] = DENSITY_MAP[i];
        const [s1, d1] = DENSITY_MAP[i + 1];
        if (scrollNorm >= s0 && scrollNorm <= s1) {
            const t = (scrollNorm - s0) / (s1 - s0);
            return lerp(d0, d1, t);
        }
    }
    return DENSITY_MAP[DENSITY_MAP.length - 1][1];
}

function isNearOrb(scrollNorm: number): boolean {
    return scrollNorm >= ORB_SCROLL_START && scrollNorm <= ORB_SCROLL_END;
}

// ── Trace Factory ──────────────────────────────────────

function spawnTrace(trace: Trace): void {
    // Start from a random edge
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
        case 0: // top
            trace.x0 = rand(0.1, 0.9);
            trace.y0 = -0.02;
            break;
        case 1: // right
            trace.x0 = 1.02;
            trace.y0 = rand(0.1, 0.9);
            break;
        case 2: // bottom
            trace.x0 = rand(0.1, 0.9);
            trace.y0 = 1.02;
            break;
        default: // left
            trace.x0 = -0.02;
            trace.y0 = rand(0.1, 0.9);
            break;
    }

    // End on opposite-ish area with some randomness
    trace.x1 = rand(0.15, 0.85);
    trace.y1 = rand(0.15, 0.85);

    // Control point — creates a gentle curve
    trace.cx = lerp(trace.x0, trace.x1, 0.5) + rand(-0.15, 0.15);
    trace.cy = lerp(trace.y0, trace.y1, 0.5) + rand(-0.15, 0.15);

    trace.progress = 0;
    trace.speed = rand(TRACE_SPEED_MIN, TRACE_SPEED_MAX);
    trace.baseOpacity = rand(TRACE_OPACITY_MIN, TRACE_OPACITY_MAX);
    trace.width = rand(0.4, 0.8);
    trace.alive = true;
}

// ── Pulse Factory ──────────────────────────────────────

function spawnPulse(pulse: Pulse, traces: Trace[]): void {
    // Prefer spawning at the leading edge of an active trace
    const activeTraces = traces.filter(t => t.alive && t.progress > 0.2 && t.progress < 0.9);
    if (activeTraces.length > 0 && Math.random() > 0.3) {
        const t = activeTraces[Math.floor(Math.random() * activeTraces.length)];
        const p = t.progress;
        // Quadratic bezier point at progress p
        const omp = 1 - p;
        pulse.x = omp * omp * t.x0 + 2 * omp * p * t.cx + p * p * t.x1;
        pulse.y = omp * omp * t.y0 + 2 * omp * p * t.cy + p * p * t.y1;
    } else {
        // Random position
        pulse.x = rand(0.1, 0.9);
        pulse.y = rand(0.1, 0.9);
    }

    pulse.age = 0;
    pulse.lifespan = rand(PULSE_LIFESPAN_MIN, PULSE_LIFESPAN_MAX);
    pulse.maxRadius = rand(PULSE_RADIUS_MIN, PULSE_RADIUS_MAX);
    pulse.maxOpacity = rand(PULSE_OPACITY_MAX * 0.5, PULSE_OPACITY_MAX);
    pulse.alive = true;
}

// ── Component ──────────────────────────────────────────

export default function SignalField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // Pre-allocated pools
    const tracesRef = useRef<Trace[]>([]);
    const pulsesRef = useRef<Pulse[]>([]);
    const nextPulseRef = useRef<number>(0); // countdown to next pulse spawn

    // Scroll state (lerped for smoothness)
    const scrollTargetRef = useRef<number>(0);
    const scrollCurrentRef = useRef<number>(0);
    const densityRef = useRef<number>(0.55);

    const initPools = useCallback(() => {
        // Pre-allocate trace pool
        const traces: Trace[] = [];
        for (let i = 0; i < MAX_TRACES; i++) {
            const trace: Trace = {
                x0: 0, y0: 0, cx: 0, cy: 0, x1: 0, y1: 0,
                progress: 0, speed: 0, baseOpacity: 0, width: 0, alive: false,
            };
            traces.push(trace);
        }
        tracesRef.current = traces;

        // Pre-allocate pulse pool
        const pulses: Pulse[] = [];
        for (let i = 0; i < MAX_PULSES; i++) {
            pulses.push({
                x: 0, y: 0, age: 0, lifespan: 0,
                maxRadius: 0, maxOpacity: 0, alive: false,
            });
        }
        pulsesRef.current = pulses;

        // Stagger initial trace spawns
        for (let i = 0; i < Math.min(4, MAX_TRACES); i++) {
            spawnTrace(traces[i]);
            traces[i].progress = rand(0.1, 0.6); // start mid-journey
        }

        nextPulseRef.current = rand(PULSE_SPAWN_INTERVAL_MIN, PULSE_SPAWN_INTERVAL_MAX);
    }, []);

    useEffect(() => {
        // Disable on touch/mobile
        if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        // ── Sizing ──
        let w = 0;
        let h = 0;

        const resize = () => {
            // Render at capped resolution for performance
            const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        window.addEventListener("resize", resize, { passive: true });

        // ── Scroll Tracking ──
        const onScroll = () => {
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            scrollTargetRef.current = docHeight > 0 ? window.scrollY / docHeight : 0;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        // ── Init ──
        initPools();
        lastTimeRef.current = performance.now();

        // ── Render Loop ──
        const render = (now: number) => {
            const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // cap dt
            lastTimeRef.current = now;

            const traces = tracesRef.current;
            const pulses = pulsesRef.current;

            // Smooth scroll interpolation
            scrollCurrentRef.current = lerp(
                scrollCurrentRef.current,
                scrollTargetRef.current,
                Math.min(dt * 2.0, 1.0)
            );
            const scrollNorm = scrollCurrentRef.current;

            // Compute current density
            const targetDensity = sampleDensity(scrollNorm);
            densityRef.current = lerp(densityRef.current, targetDensity, Math.min(dt * 1.5, 1.0));
            const density = densityRef.current;

            const nearOrb = isNearOrb(scrollNorm);

            // Clear
            ctx.clearRect(0, 0, w, h);

            // ── Update & Draw Traces ──
            let aliveCount = 0;
            for (let i = 0; i < traces.length; i++) {
                const t = traces[i];
                if (!t.alive) continue;

                t.progress += t.speed * dt * (0.7 + density * 0.3);

                if (t.progress >= 1.0) {
                    t.alive = false;
                    continue;
                }

                aliveCount++;

                // Draw the trace as a partial bezier up to current progress
                const opacity = t.baseOpacity * density;
                if (opacity < 0.005) continue;

                ctx.beginPath();
                ctx.strokeStyle = `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${opacity})`;
                ctx.lineWidth = t.width;
                ctx.lineCap = "round";

                // Draw segments up to current progress
                const steps = 20;
                const maxStep = Math.floor(t.progress * steps);
                for (let s = 0; s <= maxStep; s++) {
                    const p = s / steps;
                    const omp = 1 - p;
                    const px = omp * omp * t.x0 + 2 * omp * p * t.cx + p * p * t.x1;
                    const py = omp * omp * t.y0 + 2 * omp * p * t.cy + p * p * t.y1;

                    if (s === 0) {
                        ctx.moveTo(px * w, py * h);
                    } else {
                        ctx.lineTo(px * w, py * h);
                    }
                }

                // Fade out the last 15% of the trace
                if (t.progress > 0.85) {
                    const fadeT = (t.progress - 0.85) / 0.15;
                    ctx.globalAlpha = 1 - fadeT;
                }

                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Spawn new traces based on density
            const targetAlive = Math.round(lerp(3, MAX_TRACES, density));
            if (aliveCount < targetAlive) {
                for (let i = 0; i < traces.length && aliveCount < targetAlive; i++) {
                    if (!traces[i].alive) {
                        spawnTrace(traces[i]);
                        aliveCount++;
                        break; // one per frame to avoid clumping
                    }
                }
            }

            // ── Update & Draw Pulses ──
            for (let i = 0; i < pulses.length; i++) {
                const p = pulses[i];
                if (!p.alive) continue;

                p.age += dt;
                if (p.age >= p.lifespan) {
                    p.alive = false;
                    continue;
                }

                // Envelope: smooth rise, plateau, slow fall
                const t = p.age / p.lifespan;
                let envelope: number;
                if (t < 0.15) {
                    envelope = t / 0.15; // rise
                } else if (t < 0.4) {
                    envelope = 1.0; // plateau
                } else {
                    envelope = 1.0 - (t - 0.4) / 0.6; // fall
                }
                envelope = Math.max(0, Math.min(1, envelope));

                const currentOpacity = p.maxOpacity * envelope * density;
                const currentRadius = p.maxRadius * (0.6 + envelope * 0.4);

                if (currentOpacity < 0.003) continue;

                // Draw pulse — simple radial gradient circle
                const px = p.x * w;
                const py = p.y * h;

                const grad = ctx.createRadialGradient(px, py, 0, px, py, currentRadius);
                grad.addColorStop(0, `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${currentOpacity})`);
                grad.addColorStop(1, `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, 0)`);

                ctx.beginPath();
                ctx.arc(px, py, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }

            // Spawn new pulses on timer
            const pulseIntervalMod = nearOrb ? (1 - ORB_PROXIMITY_BOOST) : 1;
            nextPulseRef.current -= dt * density * (1 / pulseIntervalMod);

            if (nextPulseRef.current <= 0) {
                // Find a dead pulse slot
                for (let i = 0; i < pulses.length; i++) {
                    if (!pulses[i].alive) {
                        spawnPulse(pulses[i], traces);
                        break;
                    }
                }
                nextPulseRef.current = rand(PULSE_SPAWN_INTERVAL_MIN, PULSE_SPAWN_INTERVAL_MAX);
            }

            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", resize);
            window.removeEventListener("scroll", onScroll);
        };
    }, [initPools]);

    return (
        <canvas
            ref={canvasRef}
            className="signal-field-canvas"
            aria-hidden="true"
        />
    );
}
