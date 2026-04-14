"use client";

import { useEffect, useRef, useCallback } from "react";
import SpaceInvadersGame from "./SpaceInvadersGame";

interface SpaceInvadersModalProps {
  onClose: () => void;
}

/* ── Animated starfield canvas (modal background) ── */
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: { x: number; y: number; speed: number; size: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      resize();
      stars.length = 0;
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 0.2 + Math.random() * 0.8,
          size: Math.random() * 1.8 + 0.2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + s.speed * 0.6})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
      }
      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

export default function SpaceInvadersModal({ onClose }: SpaceInvadersModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  /* ── ESC to close ── */
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  /* ── Lock scroll + bind ESC ── */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [handleKey]);

  /* ── Fade-in on mount ── */
  useEffect(() => {
    requestAnimationFrame(() => {
      overlayRef.current?.classList.remove("opacity-0", "scale-95");
      overlayRef.current?.classList.add("opacity-100", "scale-100");
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Space Invaders Easter Egg"
    >
      {/* animated starfield background */}
      <Starfield />

      {/* modal card */}
      <div
        ref={overlayRef}
        className="
          relative z-10
          w-full max-w-[680px]
          max-h-[92vh] overflow-y-auto
          rounded-2xl
          border border-indigo-500/20
          bg-gradient-to-b from-slate-900/95 to-black/95
          backdrop-blur-xl shadow-2xl shadow-indigo-500/10
          opacity-0 scale-95
          transition-all duration-500 ease-out
        "
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-20
            w-8 h-8 flex items-center justify-center
            rounded-full bg-white/5 border border-white/10
            text-slate-400 hover:text-white hover:bg-white/10
            transition-all duration-200
          "
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* ── Content ── */}
        <div className="px-5 sm:px-6 py-5 space-y-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Space Invaders
            </h2>
          </div>

          {/* ── Playable game ── */}
          <SpaceInvadersGame />

          {/* ── Footer ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed max-w-md">
              Originally built in <span className="text-slate-400">Python + Pygame</span> ~4 years ago, no AI tools used.
              Recreated here as a web canvas game.
            </p>
            <a
              href="https://github.com/AdityaH1305/spaceinvaders"
              target="_blank"
              rel="noopener noreferrer"
              className="
                shrink-0
                px-4 py-1.5 rounded-lg text-xs font-medium
                bg-indigo-500/10 border border-indigo-500/30 text-indigo-300
                hover:bg-indigo-500/20 hover:border-indigo-400/50 hover:text-indigo-200
                transition-all duration-200
              "
            >
              View Source ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
