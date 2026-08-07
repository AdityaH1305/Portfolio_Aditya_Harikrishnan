/* ══════════════════════════════════════════════════════
   Living Architecture — React Component
   Phase 3: Full-viewport right-weighted system atlas

   Mounts a single <canvas> covering the viewport,
   creates the engine, handles:
   - Breakpoint detection via viewport width
   - Resize via ResizeObserver
   - Section activation via IntersectionObserver
   - Pause when document is hidden
   - Dynamic prefers-reduced-motion changes
   - Full cleanup on unmount
   ══════════════════════════════════════════════════════ */

"use client";

import { useRef, useEffect } from "react";
import { LivingArchitectureEngine } from "./engine";
import { SECTION_IDS } from "./stages";
import { getBreakpointMode, syncAccentFromCSS } from "./config";

export default function LivingArchitecture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LivingArchitectureEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Initial state ──────────────────────────────────
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let reducedMotion = motionQuery.matches;

    // Pull the accent from CSS so canvas and DOM can't drift apart.
    // Safe here: the component is dynamic({ ssr: false }), so styles
    // have applied by the time this effect runs.
    syncAccentFromCSS();

    const engine = new LivingArchitectureEngine(canvas, ctx, reducedMotion);
    engineRef.current = engine;

    // ── Initial sizing from CSS layout ─────────────────
    const rect = canvas.getBoundingClientRect();
    const mode = getBreakpointMode(window.innerWidth);
    engine.resize(rect.width, rect.height, mode);

    // ── Start (or render static for reduced motion) ────
    if (reducedMotion) {
      engine.drawStatic();
    } else {
      engine.start();
    }

    // ── Observe CSS size changes (resize / orientation) ─
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        const newMode = getBreakpointMode(window.innerWidth);
        engine.resize(width, height, newMode);
        if (reducedMotion) {
          engine.drawStatic();
        }
      }
    });
    resizeObserver.observe(canvas);

    // ── Document visibility (pause when tab hidden) ────
    const handleVisibility = () => {
      if (document.hidden) {
        engine.pause();
      } else if (!reducedMotion) {
        engine.resume();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // ── Dynamic reduced-motion preference ──────────────
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      engine.setReducedMotion(reducedMotion);
      if (reducedMotion) {
        engine.stop();
        engine.drawStatic();
      } else {
        engine.start();
      }
    };
    motionQuery.addEventListener("change", handleMotionChange);

    // ── Section observers for stage transitions ────────
    const sectionObservers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((sectionId, stageIndex) => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              engine.setStage(stageIndex);
              if (reducedMotion) {
                engine.drawStatic();
              }
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

    // ── Cleanup ────────────────────────────────────────
    return () => {
      engine.stop();
      resizeObserver.disconnect();
      sectionObservers.forEach((o) => o.disconnect());
      document.removeEventListener("visibilitychange", handleVisibility);
      motionQuery.removeEventListener("change", handleMotionChange);
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
