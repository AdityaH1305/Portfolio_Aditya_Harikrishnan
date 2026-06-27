/* ══════════════════════════════════════════════════════
   Living Architecture — React Component
   Phase 1

   Mounts a single <canvas>, creates the engine,
   handles resize via ResizeObserver, and respects
   prefers‑reduced‑motion.

   Desktop: fixed right panel (~27 vw, max 400 px)
   Mobile:  compact 100 × 100 core in the top‑right
   ══════════════════════════════════════════════════════ */

"use client";

import { useRef, useEffect } from "react";
import { LivingArchitectureEngine } from "./engine";

export default function LivingArchitecture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LivingArchitectureEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const engine = new LivingArchitectureEngine(canvas, ctx, reducedMotion);
    engineRef.current = engine;

    /* ── Initial sizing from CSS layout ── */
    const rect = canvas.getBoundingClientRect();
    engine.resize(rect.width, rect.height);

    /* ── Start (or render static for reduced motion) ── */
    if (reducedMotion) {
      engine.drawStatic();
    } else {
      engine.start();
    }

    /* ── Observe CSS size changes (resize / orientation) ── */
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        engine.resize(width, height);
        if (reducedMotion) {
          engine.drawStatic();
        }
      }
    });
    observer.observe(canvas);

    /* ── Cleanup ── */
    return () => {
      engine.stop();
      observer.disconnect();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="living-architecture-canvas"
      aria-hidden="true"
      role="presentation"
    />
  );
}
