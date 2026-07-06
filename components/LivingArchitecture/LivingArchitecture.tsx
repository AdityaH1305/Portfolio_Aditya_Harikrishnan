/* ══════════════════════════════════════════════════════
   Living Architecture — React Component
   Phase 2: Section-aware evolution

   Mounts a single <canvas>, creates the engine,
   handles resize via ResizeObserver, and respects
   prefers-reduced-motion.

   Phase 2 addition: IntersectionObserver watches each
   named section in the portfolio and calls
   engine.setStage() to drive smooth visual evolution.

   Desktop: fixed right panel (~27 vw, max 400 px)
   Mobile:  compact 100 × 100 core in the top-right
   ══════════════════════════════════════════════════════ */

"use client";

import { useRef, useEffect } from "react";
import { LivingArchitectureEngine } from "./engine";
import { SECTION_IDS } from "./stages";

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
    const resizeObserver = new ResizeObserver((entries) => {
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
    resizeObserver.observe(canvas);

    /* ── Section observers for stage transitions ── */
    const sectionObservers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((sectionId, stageIndex) => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              engine.setStage(stageIndex);
            }
          });
        },
        {
          // Trigger when the section crosses the top 40% of the viewport.
          // Same margins as SideNav for consistency.
          rootMargin: "-40% 0px -55% 0px",
          threshold: 0,
        },
      );

      observer.observe(element);
      sectionObservers.push(observer);
    });

    /* ── Cleanup ── */
    return () => {
      engine.stop();
      resizeObserver.disconnect();
      sectionObservers.forEach((o) => o.disconnect());
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
