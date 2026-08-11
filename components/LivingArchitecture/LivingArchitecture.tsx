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
import { ZONE_EVENT, ZONE_FADE_MS, ATLAS_QUIET_EVENT } from "@/lib/zone";

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

export interface LivingArchitectureProps {
  /**
   * Ambient mode: hold one stage instead of scrubbing through all eight.
   *
   * The scrub anchors against SECTION_IDS, which only exist on the home
   * page — on a case-study route every anchor would resolve to 0 and the
   * atlas would sit dead at stage 0. Ambient draws itself in once on mount
   * and then holds, so it reads as texture behind the content rather than
   * a second thing competing with the figures for attention.
   */
  ambient?: boolean;
  /** Stage to hold in ambient mode. 4 is the settled, consolidated network. */
  stage?: number;
}

export default function LivingArchitecture({
  ambient = false,
  stage = 4,
}: LivingArchitectureProps = {}) {
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

    /* ── Pause arbitration ──────────────────────────────
       THREE independent reasons to stop drawing, and they must be tracked
       separately. A single boolean means returning to the tab while the
       reader is inside the case-study zone resumes a canvas that is faded to
       0.08 and supposed to be asleep — the atlas would quietly start burning
       frames again, in the one region of the page that could least afford it.

       The zone reason is the load-shedding half of the fade in globals.css:
       the canvas is the most expensive continuous thing on the page, and #work
       is the longest region of it.

       The third is any other section asking for quiet — currently the Stack
       field, which runs a canvas of its own. That one is a SET keyed by
       source, not a boolean: with a boolean, two sections whose viewports
       briefly overlap would have the one leaving clear the flag for the one
       arriving, and the atlas would wake up underneath it. */
    let hiddenTab = document.hidden;
    let inZone = document.documentElement.classList.contains("zone-immersive");
    const quiet = new Set<string>();

    const arbitrate = () => {
      if (reducedMotion) return;
      if (hiddenTab || inZone || quiet.size > 0) engine.pause();
      else engine.resume();
    };

    const handleVisibility = () => {
      hiddenTab = document.hidden;
      arbitrate();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    /* Pausing is deferred by the length of the CSS fade so the freeze lands
       once the canvas is already down at 0.08 — stopping mid-fade leaves a
       visibly half-lit still frame. Resuming is immediate: the atlas has to be
       moving again before it is visible on the way out. */
    let zoneTimer: number | undefined;

    const handleZone = (e: Event) => {
      const active = (e as CustomEvent<{ active: boolean }>).detail.active;
      window.clearTimeout(zoneTimer);

      if (!active) {
        inZone = false;
        arbitrate();
        return;
      }
      zoneTimer = window.setTimeout(() => {
        inZone = true;
        arbitrate();
      }, ZONE_FADE_MS);
    };
    window.addEventListener(ZONE_EVENT, handleZone);

    /* No fade deferral here: the sections that ask for this own a bounded
       panel rather than retinting the page, so there is no chrome transition
       to land behind. */
    const handleQuiet = (e: Event) => {
      const { source, quiet: wants } = (
        e as CustomEvent<{ source: string; quiet: boolean }>
      ).detail;
      if (wants) quiet.add(source);
      else quiet.delete(source);
      arbitrate();
    };
    window.addEventListener(ATLAS_QUIET_EVENT, handleQuiet);

    /* ── Driver selection ──────────────────────────────
       gsap.matchMedia handles the runtime preference change and reverts
       whatever the previous branch created, so the two drivers can never
       both be attached. */
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      reducedMotion = false;
      engine.setReducedMotion(false);
      engine.start();
      /* Deep-linking to /#work mounts this inside the zone, so honour the
         current state rather than assuming we started outside it. */
      arbitrate();

      /* Driven by gsap.ticker, not its own requestAnimationFrame.
         Three rAF loops used to run during a scroll — the ticker (which
         steps Lenis), this engine, and the cursor — each scheduling
         independently, so whether the canvas drew before or after Lenis
         had written the new scroll position varied frame to frame.

         gsap.ticker reports SECONDS; the engine works in milliseconds,
         the same conversion ScrollProvider does for lenis.raf(). */
      const tick = (time: number) => engine.step(time * 1000);
      gsap.ticker.add(tick);

      /* Ambient: no scrub. setStage moves the targets once and the
         engine's lerp walks it in, so the atlas grows on mount and
         then holds. */
      if (ambient) {
        engine.setStage(stage);
        return () => {
          gsap.ticker.remove(tick);
          engine.stop();
        };
      }

      const detach = attachScrub(engine);
      return () => {
        gsap.ticker.remove(tick);
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

      if (ambient) {
        engine.setStage(stage);
        engine.drawStatic();
        return;
      }

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
      window.clearTimeout(zoneTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(ZONE_EVENT, handleZone);
      window.removeEventListener(ATLAS_QUIET_EVENT, handleQuiet);
      engineRef.current = null;
    };
  }, [ambient, stage]);

  return (
    <canvas
      ref={canvasRef}
      className={`living-architecture-canvas${ambient ? " is-ambient" : ""}`}
      aria-hidden="true"
      role="presentation"
    />
  );
}
