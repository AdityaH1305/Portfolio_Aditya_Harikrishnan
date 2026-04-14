"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const W = 600;
const H = 400;
const ASSETS = "/spaceInvaders/assets";

// Sizing
const PW = 52, PH = 50;   // player
const EW = 40, EH = 38;   // enemy
const BW = 5,  BH = 18;   // bullet

// Speeds (px / frame @ 60 fps)
const P_SPD    = 3;
const PB_SPD   = 6;        // player bullet
const EB_SPD   = 2.5;      // enemy bullet
const E_SPD    = 0.5;      // enemy base
const E_SPD_LV = 0.08;     // added per level

// Timing
const SHOOT_CD = 22;       // frames between player shots (~367ms at 60fps)
const E_SHOOT  = 0.004;    // shoot probability / enemy / frame

// Waves
const WAVE_BASE = 4;
const WAVE_INC  = 3;

// Stars
const STAR_N = 80;

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface Rect { x: number; y: number; w: number; h: number }
interface Bullet extends Rect { dy: number }
interface Enemy extends Rect { color: "red" | "green" | "blue" }
interface Particle {
  x: number; y: number;
  dx: number; dy: number;
  life: number; color: string;
}
interface Star { x: number; y: number; r: number; a: number }

type Phase = "loading" | "ready" | "playing" | "over";

interface Imgs {
  player: HTMLImageElement;
  enemies: Record<string, HTMLImageElement>;
  lasers: Record<string, HTMLImageElement>;
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */
function loadImg(name: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = `${ASSETS}/${name}`;
  });
}

function hit(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

const CLR: Record<string, string> = {
  red: "#ef4444", green: "#22c55e", blue: "#3b82f6", yellow: "#facc15",
};

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function SpaceInvadersGame() {
  const cvs = useRef<HTMLCanvasElement>(null);
  const [phase, setPhaseState] = useState<Phase>("loading");
  const [finalScore, setFinalScore] = useState(0);
  const [error, setError] = useState(false);

  /* ── mutable refs ── */
  const imgs   = useRef<Imgs | null>(null);
  const keys   = useRef(new Set<string>());
  const raf    = useRef(0);
  const ph     = useRef<Phase>("loading");

  const player  = useRef({ x: W / 2 - PW / 2, y: H - PH - 14, w: PW, h: PH, hp: 100, cd: 0 });
  const enemies = useRef<Enemy[]>([]);
  const pBuls   = useRef<Bullet[]>([]);
  const eBuls   = useRef<Bullet[]>([]);
  const parts   = useRef<Particle[]>([]);
  const stars   = useRef<Star[]>([]);
  const level   = useRef(0);
  const score   = useRef(0);
  const flash   = useRef(0);

  /* ── phase setter (sync ref + async state) ── */
  const setPhase = useCallback((p: Phase) => {
    ph.current = p;
    setPhaseState(p);
  }, []);

  /* ── init stars ── */
  useEffect(() => {
    for (let i = 0; i < STAR_N; i++) {
      stars.current.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.5 + 0.2,
      });
    }
  }, []);

  /* ── load images ── */
  useEffect(() => {
    (async () => {
      try {
        const [p, r, g, b, ly, lr, lg, lb] = await Promise.all([
          loadImg("pixel_ship_yellow.png"),
          loadImg("pixel_ship_red_small.png"),
          loadImg("pixel_ship_green_small.png"),
          loadImg("pixel_ship_blue_small.png"),
          loadImg("pixel_laser_yellow.png"),
          loadImg("pixel_laser_red.png"),
          loadImg("pixel_laser_green.png"),
          loadImg("pixel_laser_blue.png"),
        ]);
        imgs.current = {
          player: p,
          enemies: { red: r, green: g, blue: b },
          lasers: { yellow: ly, red: lr, green: lg, blue: lb },
        };
      } catch {
        imgs.current = null; // fallback to colored rectangles
      }
      setPhase("ready");
    })();
  }, [setPhase]);

  /* ── reset & start ── */
  const startGame = useCallback(() => {
    player.current = { x: W / 2 - PW / 2, y: H - PH - 14, w: PW, h: PH, hp: 100, cd: 0 };
    enemies.current = [];
    pBuls.current   = [];
    eBuls.current   = [];
    parts.current   = [];
    level.current   = 0;
    score.current   = 0;
    flash.current   = 0;
    keys.current.clear();
    setPhase("playing");
  }, [setPhase]);

  /* ── keyboard ── */
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keys.current.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === " " && (ph.current === "ready" || ph.current === "over")) {
        startGame();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key);

    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, [startGame]);

  /* ══════════════════════════════════════════
     Main game loop — runs once, never restarts
     ══════════════════════════════════════════ */
  useEffect(() => {
    const c = cvs.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    /* ── spawn a new wave of enemies ── */
    function spawnWave() {
      level.current++;
      const n = WAVE_BASE + level.current * WAVE_INC;
      const cols: Array<"red" | "green" | "blue"> = ["red", "green", "blue"];
      for (let i = 0; i < n; i++) {
        enemies.current.push({
          x: Math.random() * (W - EW - 20) + 10,
          y: -(Math.random() * 500 + 60),
          w: EW, h: EH,
          color: cols[i % 3],
        });
      }
    }

    /* ── explosion particles ── */
    function boom(e: Rect, color: string) {
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      for (let i = 0; i < 8; i++) {
        parts.current.push({
          x: cx, y: cy,
          dx: (Math.random() - 0.5) * 5,
          dy: (Math.random() - 0.5) * 5,
          life: 12 + Math.random() * 8,
          color: CLR[color] ?? "#fff",
        });
      }
    }

    /* ── update game state (one frame) ── */
    function update() {
      const p = player.current;
      const k = keys.current;

      // Movement
      if ((k.has("ArrowLeft")  || k.has("a")) && p.x > 0)              p.x -= P_SPD;
      if ((k.has("ArrowRight") || k.has("d")) && p.x + p.w < W)        p.x += P_SPD;
      if ((k.has("ArrowUp")   || k.has("w")) && p.y > 0)               p.y -= P_SPD;
      if ((k.has("ArrowDown") || k.has("s")) && p.y + p.h + 10 < H)    p.y += P_SPD;

      // Shoot
      if (p.cd > 0) p.cd--;
      if (k.has(" ") && p.cd === 0) {
        pBuls.current.push({
          x: p.x + p.w / 2 - BW / 2, y: p.y,
          w: BW, h: BH, dy: -PB_SPD,
        });
        p.cd = SHOOT_CD;
      }

      // Move bullets
      pBuls.current = pBuls.current.filter(b => { b.y += b.dy; return b.y + b.h > 0; });
      eBuls.current = eBuls.current.filter(b => { b.y += b.dy; return b.y < H; });

      // Spawn wave when clear
      if (enemies.current.length === 0) spawnWave();

      // Move enemies + enemy shooting
      const spd = E_SPD + level.current * E_SPD_LV;
      const eDead = new Set<number>();

      for (let i = 0; i < enemies.current.length; i++) {
        const e = enemies.current[i];
        e.y += spd;

        // Random shooting (only if visible)
        if (Math.random() < E_SHOOT && e.y > 0) {
          eBuls.current.push({
            x: e.x + e.w / 2 - BW / 2, y: e.y + e.h,
            w: BW, h: BH, dy: EB_SPD,
          });
        }

        // Reached bottom → damage player
        if (e.y > H) { p.hp -= 5; flash.current = 6; eDead.add(i); continue; }

        // Collides with player
        if (hit(e, p)) {
          p.hp -= 10;
          flash.current = 8;
          eDead.add(i);
          boom(e, e.color);
        }
      }

      // Player bullets vs enemies
      const bDead = new Set<number>();
      for (let bi = 0; bi < pBuls.current.length; bi++) {
        if (bDead.has(bi)) continue;
        for (let ei = 0; ei < enemies.current.length; ei++) {
          if (eDead.has(ei)) continue;
          if (hit(pBuls.current[bi], enemies.current[ei])) {
            eDead.add(ei);
            bDead.add(bi);
            score.current += 10;
            boom(enemies.current[ei], enemies.current[ei].color);
            break;
          }
        }
      }

      // Enemy bullets vs player
      eBuls.current = eBuls.current.filter(b => {
        if (hit(b, p)) { p.hp -= 10; flash.current = 8; return false; }
        return true;
      });

      // Clean up dead
      if (eDead.size) enemies.current = enemies.current.filter((_, i) => !eDead.has(i));
      if (bDead.size) pBuls.current   = pBuls.current.filter((_, i) => !bDead.has(i));

      // Update particles
      parts.current = parts.current.filter(pt => {
        pt.x += pt.dx; pt.y += pt.dy; pt.life--;
        return pt.life > 0;
      });

      // Damage flash
      if (flash.current > 0) flash.current--;

      // Game over (health-only)
      if (p.hp <= 0) {
        setFinalScore(score.current);
        setPhase("over");
      }
    }

    /* ── render everything to canvas ── */
    function render() {
      const g = imgs.current;

      // Background
      ctx.fillStyle = "#05050f";
      ctx.fillRect(0, 0, W, H);

      // Scrolling stars
      for (const s of stars.current) {
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (ph.current === "playing") {
          s.y += s.r * 0.3;
          if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        }
      }

      /* ── Loading screen ── */
      if (ph.current === "loading") {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Loading assets…", W / 2, H / 2);
        return;
      }

      /* ── Ready / title screen ── */
      if (ph.current === "ready") {
        // Decorative ships
        if (g) {
          const sy = H / 2 - 90;
          ctx.drawImage(g.enemies.red,   W / 2 - 72, sy, 36, 34);
          ctx.drawImage(g.enemies.green, W / 2 - 18, sy, 36, 34);
          ctx.drawImage(g.enemies.blue,  W / 2 + 36, sy, 36, 34);
          ctx.drawImage(g.player, W / 2 - 25, sy + 65, 50, 48);
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SPACE INVADERS", W / 2, H / 2 + 40);
        ctx.fillStyle = "#818cf8";
        ctx.font = "14px monospace";
        ctx.fillText("Press SPACE or click START", W / 2, H / 2 + 70);
        ctx.fillStyle = "#64748b";
        ctx.font = "11px monospace";
        ctx.fillText("Arrow keys / WASD to move · SPACE to shoot", W / 2, H / 2 + 95);
        return;
      }

      /* ── Playing or Game Over — draw all entities ── */
      const p = player.current;

      // Enemies
      for (const e of enemies.current) {
        if (g?.enemies[e.color]) {
          ctx.drawImage(g.enemies[e.color], e.x, e.y, e.w, e.h);
        } else {
          ctx.fillStyle = CLR[e.color];
          ctx.fillRect(e.x, e.y, e.w, e.h);
        }
      }

      // Player bullets
      for (const b of pBuls.current) {
        if (g?.lasers.yellow) {
          ctx.drawImage(g.lasers.yellow, b.x - 1, b.y, b.w + 2, b.h);
        } else {
          ctx.fillStyle = "#facc15";
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      }

      // Enemy bullets (with glow)
      for (const b of eBuls.current) {
        ctx.fillStyle = "rgba(239,68,68,0.25)";
        ctx.fillRect(b.x - 2, b.y - 1, b.w + 4, b.h + 2);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      // Explosion particles
      for (const pt of parts.current) {
        ctx.globalAlpha = Math.max(0, pt.life / 20);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // Player ship
      if (g?.player) {
        ctx.drawImage(g.player, p.x, p.y, p.w, p.h);
      } else {
        ctx.fillStyle = "#facc15";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      // Health bar
      const hy = p.y + p.h + 4;
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(p.x, hy, p.w, 4);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(p.x, hy, p.w * Math.max(0, p.hp / 100), 4);

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`HP: ${Math.max(0, p.hp)}`, 10, 22);
      ctx.textAlign = "right";
      ctx.fillText(`Level: ${level.current}`, W - 10, 22);
      ctx.textAlign = "center";
      ctx.fillText(`Score: ${score.current}`, W / 2, 22);

      // Damage flash overlay
      if (flash.current > 0) {
        ctx.fillStyle = `rgba(239,68,68,${flash.current / 25})`;
        ctx.fillRect(0, 0, W, H);
      }

      /* ── Game over overlay ── */
      if (ph.current === "over") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 34px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);

        ctx.fillStyle = "#fff";
        ctx.font = "20px monospace";
        ctx.fillText(`Score: ${score.current}`, W / 2, H / 2 + 15);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "13px monospace";
        ctx.fillText("Press SPACE or click RESTART", W / 2, H / 2 + 48);
      }
    }

    /* ── tick ── */
    function tick() {
      try {
        if (ph.current === "playing") update();
        render();
      } catch (err) {
        console.error("SpaceInvaders error:", err);
        setError(true);
        return; // stop loop on critical error
      }
      raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ══════════════════════════════════════════
     Render
     ══════════════════════════════════════════ */

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">Failed to load game. Please reopen the modal.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
        <canvas
          ref={cvs}
          width={W}
          height={H}
          className="block"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between w-full" style={{ maxWidth: W }}>
        <span className="text-[11px] text-slate-500 tracking-wide">
          Arrow keys / WASD · Space to shoot
        </span>

        {phase === "ready" && (
          <button
            onClick={startGame}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400/50 transition-all duration-200"
          >
            Start Game
          </button>
        )}

        {phase === "over" && (
          <button
            onClick={startGame}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400/50 transition-all duration-200"
          >
            Restart · {finalScore} pts
          </button>
        )}
      </div>
    </div>
  );
}
