"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════
   Cursor — reticle core, oscilloscope ring, target lock

   Replaces CursorGlow, whose glow is folded in below as a
   plain DOM radial rather than a second rAF loop.

   Three motifs, all of them instrumentation, which is why
   they sit with the atlas aesthetic instead of fighting it:

     • crosshair + corner brackets that lock onto targets
     • a ring drawn as a live circular waveform whose
       amplitude tracks pointer velocity — an oscilloscope
     • weighted click physics: the core depresses and
       rebounds on a damped spring, the way a graded piano
       key does. Felt, never drawn.

   ── Why not one full-viewport canvas ──
   Hiding the native cursor makes latency obvious, and a
   viewport-sized canvas clearing every frame would sit on
   top of the LivingArchitecture canvas already doing that.
   So: a 200×200 canvas translated to the pointer for the
   curves, and DOM for the glow, brackets and label — those
   are transform-only work and never repaint.

   ── The latency rule (load-bearing) ──
   The canvas is translated to the RAW pointer position, so
   the crosshair sits exactly under the physical cursor. Only
   the ring lags, drawn at an offset inside the canvas. Ease
   the core and the whole thing feels broken.
   ══════════════════════════════════════════════════════ */

const BOX = 200; // canvas CSS size; half of it is the max ring lag + radius
const HALF = BOX / 2;

/* How far the ring may trail the pointer, and how hard it chases.
   These were 46px at 0.18 and the ring swung far enough behind a moving
   pointer to be distracting. The trail should read as weight, not as a
   second object orbiting the cursor. */
const MAX_LAG = 18;
const FOLLOW = 0.34;

type State =
    | "default"
    | "link"
    | "read"
    | "zoom"
    | "play"
    | "pause"
    | "expand"
    | "scrub"
    | "probe"
    | "game"
    | "text";

interface StateSpec {
    /** Ring radius in px. */
    r: number;
    /** Waveform amplitude multiplier. */
    amp: number;
    /** Harmonics on the ring — higher reads as a brighter timbre. */
    harm: number;
    label: string;
    /** Draw corner brackets locked to the hovered element. */
    lock: boolean;
}

/* `amp` is peak waveform deviation in px before the velocity term. Kept
   deliberately small: the ring should shimmer, not pulse. */
const STATES: Record<State, StateSpec> = {
    default: { r: 13, amp: 1.0, harm: 3, label: "", lock: false },
    link: { r: 24, amp: 1.3, harm: 3, label: "", lock: false },
    read: { r: 30, amp: 1.4, harm: 4, label: "READ CASE STUDY", lock: true },
    zoom: { r: 27, amp: 1.0, harm: 5, label: "ZOOM", lock: false },
    play: { r: 30, amp: 1.3, harm: 4, label: "PLAY", lock: true },
    pause: { r: 30, amp: 1.3, harm: 4, label: "PAUSE", lock: true },
    expand: { r: 28, amp: 1.2, harm: 4, label: "EXPAND", lock: true },
    scrub: { r: 18, amp: 0.5, harm: 8, label: "SCRUB", lock: false },
    probe: { r: 15, amp: 0.4, harm: 6, label: "", lock: false },
    game: { r: 34, amp: 1.9, harm: 2, label: "", lock: true },
    text: { r: 0, amp: 0, harm: 3, label: "", lock: false },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function Cursor() {
    const rootRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const lockRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        /* Fine pointer only, and never under reduced motion. The class that
           hides the native cursor is added from here and nowhere else, so the
           failure mode is always "no custom cursor", never "no cursor". */
        if (!window.matchMedia("(pointer: fine)").matches) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;

        const root = rootRef.current;
        const canvas = canvasRef.current;
        const glow = glowRef.current;
        const lockEl = lockRef.current;
        const label = labelRef.current;
        if (!root || !canvas || !glow || !lockEl || !label) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const html = document.documentElement;
        html.classList.add("cursor-custom");

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = BOX * dpr;
        canvas.height = BOX * dpr;

        let accent: [number, number, number] = [34, 211, 238];
        const raw = getComputedStyle(html)
            .getPropertyValue("--accent-rgb")
            .trim();
        if (raw) {
            const p = raw.split(/[\s,]+/).map(Number);
            if (p.length === 3 && p.every((v) => !Number.isNaN(v)))
                accent = p as [number, number, number];
        }
        const [ar, ag, ab] = accent;
        const A = (a: number) => `rgba(${ar}, ${ag}, ${ab}, ${a})`;

        // ── Live state ──────────────────────────────────
        const pointer = { x: -9999, y: -9999 }; // raw, never eased
        const eased = { x: -9999, y: -9999 };
        let speed = 0;
        let phase = 0;

        let state: State = "default";
        let hovered: Element | null = null;

        // Ring radius eases between states so transitions feel mechanical.
        let radius = STATES.default.r;
        let ampEase = 1;

        // Hammer action: a damped spring, slightly under-damped so the
        // release overshoots and settles the way a weighted key does.
        let press = 1;
        let pressV = 0;
        let pressed = false;

        // Corner-bracket target box, eased toward the hovered element.
        const box = { x: 0, y: 0, w: 0, h: 0, o: 0 };
        let boxInit = false;

        // Easter-egg charge arc.
        let charge = 0;
        let chargeAt = 0;

        let visible = false;
        let rafId = 0;
        let running = true;

        // ── Input ───────────────────────────────────────
        const onMove = (e: PointerEvent) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            if (!visible) {
                // First sighting: snap the easing targets so the ring does
                // not fly in from the top-left corner.
                eased.x = e.clientX;
                eased.y = e.clientY;
                visible = true;
                root.style.opacity = "1";
            }
        };

        const resolve = (target: Element | null): [State, Element | null] => {
            if (!target) return ["default", null];
            const tagged = target.closest<HTMLElement>("[data-cursor]");
            if (tagged) {
                const v = tagged.dataset.cursor as State;
                if (v in STATES) return [v, tagged];
            }
            const clickable = target.closest(
                "a, button, [role='button'], summary",
            );
            if (clickable) return ["link", clickable];
            return ["default", null];
        };

        const onOver = (e: PointerEvent) => {
            const [next, el] = resolve(e.target as Element | null);
            state = next;
            hovered = el;
            root.style.opacity = next === "text" ? "0" : visible ? "1" : "0";
        };

        const onDown = () => {
            pressed = true;
        };
        const onUp = () => {
            pressed = false;
        };
        const onLeave = () => {
            visible = false;
            root.style.opacity = "0";
        };
        const onEnter = () => {
            if (state !== "text") {
                visible = true;
                root.style.opacity = "1";
            }
        };

        const onCharge = (e: Event) => {
            const d = (e as CustomEvent<{ n: number; required: number }>)
                .detail;
            if (!d?.required) return;
            charge = Math.min(1, d.n / d.required);
            chargeAt = performance.now();
        };

        // ── Frame ───────────────────────────────────────
        const frame = () => {
            if (!running) return;

            /* Re-read the hovered element's own attribute every frame.
               `pointerover` only fires when the pointer crosses into a new
               element, so a state that changes UNDER a stationary pointer —
               the video flipping play→pause on click — would otherwise never
               reach the cursor. A dataset read is far cheaper than a
               MutationObserver and needs no wiring per component. */
            if (hovered instanceof HTMLElement) {
                const live = hovered.dataset.cursor as State | undefined;
                if (live && live in STATES) state = live;
            }

            const spec = STATES[state];

            const dx = pointer.x - eased.x;
            const dy = pointer.y - eased.y;
            eased.x += dx * FOLLOW;
            eased.y += dy * FOLLOW;

            /* Velocity still opens the waveform up, but the cap is 30 rather
               than 60 and the coefficient below is a third of what it was.
               At full speed the ring used to deviate ~13px, which is what
               made it restless. */
            speed = lerp(speed, Math.min(Math.hypot(dx, dy), 30), 0.1);

            radius = lerp(radius, spec.r, 0.16);
            ampEase = lerp(ampEase, spec.amp, 0.14);

            // Spring integrate. Stiffness/damping tuned for one visible
            // rebound rather than a wobble.
            const pressTarget = pressed ? 0.55 : 1;
            pressV += (pressTarget - press) * 0.28;
            pressV *= 0.68;
            press += pressV;

            phase += 0.055 + speed * 0.0025;

            // The canvas rides the RAW pointer; the ring is drawn at the
            // easing offset inside it, clamped so it cannot leave the box.
            const ox = Math.max(-MAX_LAG, Math.min(MAX_LAG, eased.x - pointer.x));
            const oy = Math.max(-MAX_LAG, Math.min(MAX_LAG, eased.y - pointer.y));

            canvas.style.transform = `translate3d(${pointer.x - HALF}px, ${
                pointer.y - HALF
            }px, 0)`;
            glow.style.transform = `translate3d(${eased.x - 160}px, ${eased.y - 160}px, 0)`;

            // ── Canvas ──
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, BOX, BOX);
            ctx.translate(HALF, HALF);

            const R = radius * press;

            if (R > 0.5) {
                // Circular waveform. Radius modulated by a harmonic series,
                // so the ring reads as a waveform rather than a dashed circle.
                const amp = ampEase * (1.5 + speed * 0.045);
                ctx.beginPath();
                for (let i = 0; i <= 96; i++) {
                    const t = (i / 96) * Math.PI * 2;
                    const w =
                        Math.sin(t * spec.harm + phase) * amp +
                        Math.sin(t * spec.harm * 2 + phase * 1.6) * amp * 0.35;
                    const rr = R + w;
                    const x = ox + Math.cos(t) * rr;
                    const y = oy + Math.sin(t) * rr;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.strokeStyle = A(0.55);
                ctx.lineWidth = 1;
                ctx.stroke();

                // Quadrant ticks — the instrument reading.
                ctx.strokeStyle = A(0.32);
                ctx.beginPath();
                for (let q = 0; q < 4; q++) {
                    const t = (q / 4) * Math.PI * 2 + Math.PI / 4;
                    const c = Math.cos(t);
                    const s = Math.sin(t);
                    ctx.moveTo(ox + c * (R + 5), oy + s * (R + 5));
                    ctx.lineTo(ox + c * (R + 9), oy + s * (R + 9));
                }
                ctx.stroke();
            }

            // Charge arc for the SideNav easter egg.
            const age = performance.now() - chargeAt;
            if (charge > 0 && age < 1100) {
                const fade = 1 - age / 1100;
                ctx.beginPath();
                ctx.arc(
                    ox,
                    oy,
                    R + 14,
                    -Math.PI / 2,
                    -Math.PI / 2 + charge * Math.PI * 2,
                );
                ctx.strokeStyle = A(0.85 * fade);
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Crosshair core, at the true pointer (0,0 after translate).
            const arm = state === "game" ? 11 : 6;
            const gap = state === "game" ? 5 : 2.5;
            ctx.strokeStyle = A(0.95);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-gap - arm, 0);
            ctx.lineTo(-gap, 0);
            ctx.moveTo(gap, 0);
            ctx.lineTo(gap + arm, 0);
            ctx.moveTo(0, -gap - arm);
            ctx.lineTo(0, -gap);
            ctx.moveTo(0, gap);
            ctx.lineTo(0, gap + arm);
            ctx.stroke();

            ctx.fillStyle = A(1);
            ctx.beginPath();
            ctx.arc(0, 0, 1.6 * press, 0, Math.PI * 2);
            ctx.fill();

            // Scrub gets explicit direction, since the seek bar is a drag.
            if (state === "scrub") {
                ctx.strokeStyle = A(0.9);
                ctx.beginPath();
                ctx.moveTo(-22, 0);
                ctx.lineTo(-17, -4);
                ctx.moveTo(-22, 0);
                ctx.lineTo(-17, 4);
                ctx.moveTo(22, 0);
                ctx.lineTo(17, -4);
                ctx.moveTo(22, 0);
                ctx.lineTo(17, 4);
                ctx.stroke();
            }

            // ── Target lock ──
            const rect =
                spec.lock && hovered ? hovered.getBoundingClientRect() : null;
            if (rect) {
                if (!boxInit) {
                    box.x = rect.left;
                    box.y = rect.top;
                    box.w = rect.width;
                    box.h = rect.height;
                    boxInit = true;
                }
                box.x = lerp(box.x, rect.left, 0.22);
                box.y = lerp(box.y, rect.top, 0.22);
                box.w = lerp(box.w, rect.width, 0.22);
                box.h = lerp(box.h, rect.height, 0.22);
                box.o = lerp(box.o, 1, 0.2);
            } else {
                box.o = lerp(box.o, 0, 0.25);
                if (box.o < 0.02) boxInit = false;
            }

            lockEl.style.opacity = String(box.o);
            lockEl.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
            lockEl.style.width = `${box.w}px`;
            lockEl.style.height = `${box.h}px`;

            // ── Label ──
            let text = spec.label;
            if (state === "probe" && hovered) {
                const r = hovered.getBoundingClientRect();
                text = `${Math.round(pointer.x - r.left)}, ${Math.round(
                    pointer.y - r.top,
                )}`;
            }
            if (label.textContent !== text) label.textContent = text;
            label.style.opacity = text ? "1" : "0";
            label.style.transform = `translate3d(${pointer.x + 20}px, ${
                pointer.y + 16
            }px, 0)`;

            rafId = requestAnimationFrame(frame);
        };

        // ── Bind ────────────────────────────────────────
        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerover", onOver, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        document.addEventListener("mouseleave", onLeave);
        document.addEventListener("mouseenter", onEnter);
        window.addEventListener("cursor:charge", onCharge);

        const onVisibility = () => {
            if (document.hidden) {
                running = false;
                cancelAnimationFrame(rafId);
            } else if (!running) {
                running = true;
                rafId = requestAnimationFrame(frame);
            }
        };
        document.addEventListener("visibilitychange", onVisibility);

        rafId = requestAnimationFrame(frame);

        return () => {
            running = false;
            cancelAnimationFrame(rafId);
            html.classList.remove("cursor-custom");
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerover", onOver);
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            document.removeEventListener("mouseleave", onLeave);
            document.removeEventListener("mouseenter", onEnter);
            window.removeEventListener("cursor:charge", onCharge);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    /* z-[10000] clears every overlay on the site — the lightbox, video
       player and game modal all sit at 9999. pointer-events:none keeps
       clicks, drags and text selection working underneath. */
    return (
        <div
            ref={rootRef}
            aria-hidden="true"
            /* No responsive `hidden` here. The only gate is the
               `(pointer: fine)` check in the effect, which is also what adds
               the class that hides the native cursor. A viewport-width gate
               would hide this layer on a narrow desktop window while the
               native cursor stayed hidden — leaving no cursor at all. */
            className="fixed inset-0 z-[10000] pointer-events-none opacity-0
                       transition-opacity duration-200"
        >
            {/* Soft ambient glow — the old CursorGlow, now DOM instead of a
                second rAF loop. */}
            <div
                ref={glowRef}
                className="absolute top-0 left-0 w-80 h-80 rounded-full"
                style={{
                    background:
                        "radial-gradient(circle closest-side, rgb(var(--accent-rgb) / 0.06) 0%, rgb(var(--accent-rgb) / 0.015) 40%, rgb(var(--accent-rgb) / 0) 100%)",
                    mixBlendMode: "screen",
                    willChange: "transform",
                }}
            />

            {/* Target lock. Four corner rules on a sized box. */}
            <div
                ref={lockRef}
                className="absolute top-0 left-0 opacity-0"
                style={{ willChange: "transform, width, height" }}
            >
                <span className="absolute -top-px -left-px w-3 h-3 border-t border-l border-accent" />
                <span className="absolute -top-px -right-px w-3 h-3 border-t border-r border-accent" />
                <span className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-accent" />
                <span className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-accent" />
            </div>

            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0"
                style={{
                    width: BOX,
                    height: BOX,
                    transform: `translate3d(-9999px, -9999px, 0)`,
                    willChange: "transform",
                }}
            />

            <span
                ref={labelRef}
                className="absolute top-0 left-0 mono text-[0.625rem] tracking-[0.14em]
                           uppercase text-accent whitespace-nowrap opacity-0
                           transition-opacity duration-200"
                style={{ willChange: "transform" }}
            />
        </div>
    );
}
