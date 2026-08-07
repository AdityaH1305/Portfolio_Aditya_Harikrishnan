/* ══════════════════════════════════════════════════════
   Living Architecture — React Component
   Phase 3: Full-viewport right-weighted system atlas

   Mounts a single <canvas> covering the viewport,
   creates the engine, handles:
   - Breakpoint detection via viewport width
   - Resize via ResizeObserver
   - Section activation: ScrollTrigger scrub normally,
     IntersectionObserver under reduced motion
   - Pause when document is hidden
   - Dynamic prefers-reduced-motion changes
   - Full cleanup on unmount
   ══════════════════════════════════════════════════════ */

"use client";

import { useRef, useEffect } from "react";
import { LivingArchitectureEngine } from "./engine";
import { SECTION_IDS } from "./stages";
import { getBreakpointMode, syncAccentFromCSS } from "./config";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";

/**
 * Map scroll position to a continuous stage index.
 *
 * Anchored to sections rather than raw document progress: a long section
 * would otherwise drag the atlas out of sync with what's on screen. Each
 * anchor is where a section's top crosses 40% of the viewport, which is the
 * same activation point the IntersectionObserver path uses — so `p` is an
 * integer exactly when the discrete driver would have fired.
 */
function attachScrub(engine: LivingArchitectureEngine): () => void {
  let anchors: number[] = [];

  const measure = () => {
    anchors = SECTION_IDS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return 0;
      return (
        el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4
      );
    });

    /* The first anchor is negative — the hero's top minus 40% of the
       viewport sits above the document — so without this the page would
       open at p≈0.4 and stage 0, the dormant core, would be unreachable.
       Pinning it to 0 makes the top of the page exactly stage 0. */
    if (anchors.length > 0) anchors[0] = 0;
  };

  const toProgress = (y: number): number => {
    const last = anchors.length - 1;
    if (last < 1) return 0;
    if (y <= anchors[0]) return 0;
    if (y >= anchors[last]) return last;
    for (let i = 0; i < last; i++) {
      if (y < anchors[i + 1]) {
        const span = anchors[i + 1] - anchors[i];
        return span > 0 ? i + (y - anchors[i]) / span : i;
      }
    }
    return last;
  };

  const st = ScrollTrigger.create({
    start: 0,
    end: "max",
    /* scrub:true maps 1:1. Deliberately no scrub smoothing — Lenis already
       eases the scroll and the engine's lerp already eases the targets;
       a third smoothing stage reads as lag rather than weight. */
    scrub: true,
    onRefresh: measure,
    onUpdate: () => engine.setProgress(toProgress(window.scrollY)),
  });

  measure();
  return () => st.kill();
}

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
    registerGsap();
    syncAccentFromCSS();

    const engine = new LivingArchitectureEngine(canvas, ctx, reducedMotion);
    engineRef.current = engine;

    // ── Initial sizing from CSS layout ─────────────────
    const rect = canvas.getBoundingClientRect();
    const mode = getBreakpointMode(window.innerWidth);
    engine.resize(rect.width, rect.height, mode);

    // Driver selection happens in the matchMedia block below.

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

    /* ── Driver selection ──────────────────────────────
       gsap.matchMedia handles the runtime preference change and reverts
       whatever the previous branch created, so the two drivers can never
       both be attached. */
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      reducedMotion = false;
      engine.setReducedMotion(false);
      engine.start();
      const detach = attachScrub(engine);
      return () => {
        detach();
        engine.stop();
      };
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      /* Reduced motion keeps the original discrete driver: stages snap on
         section entry and the canvas renders one static frame. */
      reducedMotion = true;
      engine.setReducedMotion(true);
      engine.stop();

      const observers = SECTION_IDS.map((sectionId, stageIndex) => {
        const element = document.getElementById(sectionId);
        if (!element) return null;
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                engine.setStage(stageIndex);
                engine.drawStatic();
              }
            });
          },
          { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
        );
        observer.observe(element);
        return observer;
      }).filter(Boolean) as IntersectionObserver[];

      engine.drawStatic();
      return () => observers.forEach((o) => o.disconnect());
    });

    // ── Cleanup ────────────────────────────────────────
    return () => {
      mm.revert();
      engine.stop();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
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
