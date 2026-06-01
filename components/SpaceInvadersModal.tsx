"use client";

import { useEffect, useRef, useCallback, useState } from "react";
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
        ctx.fillStyle = `rgba(56,189,248,${0.2 + s.speed * 0.4})`; /* sky-400 tint for stars */
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
  const [mounted, setMounted] = useState(false);

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

  /* ── Graceful fade-in on mount ── */
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMounted(true);
      });
    });
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-500 ease-out ${
        mounted ? "bg-black/90 backdrop-blur-md" : "bg-transparent"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Space Invaders Easter Egg"
    >
      {/* animated starfield background */}
      <Starfield />

      {/* Subtle ambient cyan glow behind modal */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(56, 189, 248, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* modal card */}
      <div
        className={`
          relative z-10
          w-full max-w-[680px]
          max-h-[92vh] overflow-y-auto
          rounded-2xl
          border border-sky-500/20
          bg-gradient-to-b from-[#09090b]/95 to-black/95
          backdrop-blur-xl shadow-2xl shadow-sky-500/10
          transition-all duration-500 ease-out
          ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
      >
        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-20
            w-8 h-8 flex items-center justify-center
            rounded-full bg-white/5 border border-white/10
            text-zinc-500 hover:text-white hover:bg-white/10 hover:border-sky-500/50
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
            <span className="text-2xl drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">🚀</span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
              Space Invaders
            </h2>
          </div>

          {/* ── Playable game ── */}
          <SpaceInvadersGame />

          {/* ── Footer ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
            <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed max-w-md">
              Originally built in <span className="text-sky-400 font-medium">Python + Pygame</span> ~4 years ago, no AI tools used.
              Recreated here as a web canvas game.
            </p>
            <a
              href="https://github.com/AdityaH1305/spaceinvaders"
              target="_blank"
              rel="noopener noreferrer"
              className="
                shrink-0
                px-4 py-1.5 rounded-lg text-xs font-medium
                bg-white/5 border border-white/10 text-zinc-300
                hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-300
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
