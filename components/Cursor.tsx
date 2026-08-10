"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion";

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
    | "caret"
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
   deliberately small: the ring should shimmer, not pulse. Scaled down ~20%
   here on top of a reduced amplitude term in the draw block — together those
   halve the visible wave while keeping it readable as a waveform rather than
   flattening it into a plain circle. */
const STATES: Record<State, StateSpec> = {
    default: { r: 13, amp: 0.8, harm: 3, label: "", lock: false },
    link: { r: 24, amp: 1.05, harm: 3, label: "", lock: false },
    read: { r: 30, amp: 1.1, harm: 4, label: "READ CASE STUDY", lock: true },
    zoom: { r: 27, amp: 0.8, harm: 5, label: "ZOOM", lock: false },
    play: { r: 30, amp: 1.05, harm: 4, label: "PLAY", lock: true },
    pause: { r: 30, amp: 1.05, harm: 4, label: "PAUSE", lock: true },
    expand: { r: 28, amp: 1.0, harm: 4, label: "EXPAND", lock: true },
    scrub: { r: 18, amp: 0.4, harm: 8, label: "SCRUB", lock: false },
    probe: { r: 15, amp: 0.3, harm: 6, label: "", lock: false },
    game: { r: 34, amp: 1.5, harm: 2, label: "", lock: true },
    /* r: 0 collapses the ring — the caret is the whole cursor over plain
       text. Distinct from `text`, which hides this layer entirely and hands
       real inputs back to the native caret. */
    caret: { r: 0, amp: 0, harm: 3, label: "", lock: false },
    text: { r: 0, amp: 0, harm: 3, label: "", lock: false },
};

/* ── Tuning knobs ──
   The three values most likely to need another nudge, kept together and
   named so they don't have to be hunted for inside the draw block. */
const WAVE_BASE = 1.2; // amplitude at rest
const WAVE_PER_SPEED = 0.028; // extra amplitude per px/frame of pointer speed
const CROSS_ARM = 4; // crosshair arm length; the gap is CROSS_ARM / 2

/** Magnetic snap only applies to targets this size or smaller, in px. */
const SNAP_MAX_SIZE = 120;
/** Peak pull toward a target's centre. 1 would pin the ring to it. */
const SNAP_STRENGTH = 0.55;
/** Ring lag ceiling while snapping — a deliberate pull, not a flick. */
const SNAP_MAX_LAG = 26;
/** Stillness before the waveform flatlines. */
const IDLE_AFTER_MS = 2500;
/** Click impact ring lifetime. */
const IMPACT_MS = 450;
/** Sample the probe canvas every Nth frame. 60/4 = 15Hz, plenty for a readout. */
const PROBE_EVERY = 4;

/* Plain text. Checked AFTER [data-cursor] and after the clickable test, so a
   card title inside an anchor keeps `read` rather than becoming a caret. */
const TEXT_SELECTOR =
    "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, dd, dt, code, pre, td, th";

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
        // Last written size, so a settled lock stops touching layout.
        let lastBoxW = -1;
        let lastBoxH = -1;

        // Easter-egg charge arc.
        let charge = 0;
        let chargeAt = 0;

        // Click impact ring — one timestamp, so rapid clicks restart it
        // rather than stacking rings on top of each other.
        let impactAt = -IMPACT_MS;

        // Idle flatline. `idle` eases 0→1 after IDLE_AFTER_MS of stillness.
        let lastMoveAt = performance.now();
        let idle = 0;

        // Live mask value under the crosshair on the gait canvas, 0–255.
        let probeVal: number | null = null;
        let frameCount = 0;

        // Previous pointer, so speed measures real pointer travel rather
        // than the distance to an eased (and possibly snapped) target.
        const prev = { x: -9999, y: -9999 };

        /* Cached bounding box of the hovered element.
           getBoundingClientRect forces a synchronous layout, and calling it
           once per frame interleaved this flush with Lenis's scroll writes
           on every single frame. The lock box lerps at 0.22 and the snap
           blend is smoothed, so a rect up to two frames stale is invisible —
           but the layout flush was not. */
        let rectCache: DOMRect | null = null;
        let rectFor: Element | null = null;
        let rectAt = -99;

        let visible = false;

        // ── Input ───────────────────────────────────────
        const onMove = (e: PointerEvent) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            lastMoveAt = performance.now();
            if (!visible) {
                // First sighting: snap the easing targets so the ring does
                // not fly in from the top-left corner.
                eased.x = e.clientX;
                eased.y = e.clientY;
                prev.x = e.clientX;
                prev.y = e.clientY;
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
            // No element returned: plain text gets neither snap nor lock.
            if (target.closest(TEXT_SELECTOR)) return ["caret", null];
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
            impactAt = performance.now();
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
            frameCount++;
            const now = performance.now();

            /* Measured at most every 3rd frame, and only when something
               actually consumes it — a lock, a probe readout, or a
               snap-eligible target. Shared by all three. */
            const wantsRect = !!hovered && state !== "caret";
            if (!wantsRect) {
                rectCache = null;
                rectFor = null;
            } else if (hovered !== rectFor || frameCount - rectAt >= 3) {
                rectCache = hovered!.getBoundingClientRect();
                rectFor = hovered;
                rectAt = frameCount;
            }
            const rect = rectCache;

            /* ── Magnetic snap ──
               The ring's target blends toward a small element's centre; the
               crosshair core below still rides the true pointer, so nothing
               misrepresents where a click will land. Size-gated: pulling a
               full-width case-study card toward its centre would feel sticky
               and wrong, and only small targets benefit from aim assist. */
            let tx = pointer.x;
            let ty = pointer.y;
            let snapping = false;
            if (
                rect &&
                rect.width > 0 &&
                rect.width <= SNAP_MAX_SIZE &&
                rect.height <= SNAP_MAX_SIZE
            ) {
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const reach = Math.max(rect.width, rect.height) * 0.75 + 12;
                const dist = Math.hypot(pointer.x - cx, pointer.y - cy);
                const k = SNAP_STRENGTH * Math.max(0, 1 - dist / reach);
                if (k > 0.001) {
                    tx = lerp(pointer.x, cx, k);
                    ty = lerp(pointer.y, cy, k);
                    snapping = true;
                }
            }

            eased.x += (tx - eased.x) * FOLLOW;
            eased.y += (ty - eased.y) * FOLLOW;

            /* Speed is measured from actual pointer travel, not from the
               distance to the eased target — with snap active that distance
               includes the pull and would inflate the waveform for standing
               still next to a button. */
            const travel = Math.hypot(pointer.x - prev.x, pointer.y - prev.y);
            prev.x = pointer.x;
            prev.y = pointer.y;
            speed = lerp(speed, Math.min(travel, 30), 0.1);

            /* ── Idle flatline ──
               Slow to settle, fast to wake: an oscilloscope losing signal
               should drift off, but pick up the instant there is input. */
            const idleTarget = now - lastMoveAt > IDLE_AFTER_MS ? 1 : 0;
            idle = lerp(idle, idleTarget, idleTarget ? 0.03 : 0.3);

            radius = lerp(radius, spec.r, 0.16);
            ampEase = lerp(ampEase, spec.amp, 0.14);

            /* ── Live pixel probe ──
               Over the gait canvas, read the real mask value under the
               crosshair. GaitPipeline writes silhouette intensity into the
               ALPHA channel, so data[3] is the actual 0–255 value rather
               than a proxy derived from the tint. */
            if (state === "probe" && hovered instanceof HTMLCanvasElement) {
                if (frameCount % PROBE_EVERY === 0 && rect && rect.width > 0) {
                    const c2 = hovered.getContext("2d");
                    const px = Math.round(
                        (pointer.x - rect.left) * (hovered.width / rect.width),
                    );
                    const py = Math.round(
                        (pointer.y - rect.top) * (hovered.height / rect.height),
                    );
                    if (
                        c2 &&
                        px >= 0 &&
                        py >= 0 &&
                        px < hovered.width &&
                        py < hovered.height
                    ) {
                        try {
                            probeVal = c2.getImageData(px, py, 1, 1).data[3];
                        } catch {
                            probeVal = null; // tainted canvas — never fatal
                        }
                    } else {
                        probeVal = null;
                    }
                }
            } else {
                probeVal = null;
            }

            // Spring integrate. Stiffness/damping tuned for one visible
            // rebound rather than a wobble.
            const pressTarget = pressed ? 0.62 : 1;
            pressV += (pressTarget - press) * 0.28;
            pressV *= 0.68;
            press += pressV;

            phase += 0.042 + speed * 0.0016;

            /* The canvas rides the RAW pointer; the ring is drawn at the
               easing offset inside it, clamped so it cannot leave the box.

               Snapping gets a larger ceiling: the base clamp exists to stop a
               fast flick dragging the ring off-canvas, but a snap offset is
               deliberate and would otherwise be truncated mid-pull. */
            const lagCap = snapping ? SNAP_MAX_LAG : MAX_LAG;
            const ox = Math.max(-lagCap, Math.min(lagCap, eased.x - pointer.x));
            const oy = Math.max(-lagCap, Math.min(lagCap, eased.y - pointer.y));

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
                // `1 - idle` is the flatline: the trace collapses onto a
                // true circle when the pointer has been still.
                const amp =
                    ampEase * (WAVE_BASE + speed * WAVE_PER_SPEED) * (1 - idle);
                ctx.beginPath();
                for (let i = 0; i <= 96; i++) {
                    const t = (i / 96) * Math.PI * 2;
                    const w =
                        Math.sin(t * spec.harm + phase) * amp +
                        Math.sin(t * spec.harm * 2 + phase * 1.6) * amp * 0.25;
                    const rr = R + w;
                    const x = ox + Math.cos(t) * rr;
                    const y = oy + Math.sin(t) * rr;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();

                /* Stroked twice from the same path: a dark carrier first,
                   then the accent on top. A single accent hairline vanishes
                   over the pale gait silhouettes and light video frames — a
                   cursor has to stay legible on every background, and this
                   costs one extra stroke() with no extra geometry. */
                ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
                ctx.lineWidth = 2.5;
                ctx.stroke();

                /* Ring brightness carries two readings: it dims as the trace
                   flatlines, and over the gait canvas it tracks the sampled
                   mask value — so the ring visibly lifts as the crosshair
                   crosses a silhouette edge. */
                const probeLift =
                    probeVal !== null ? 0.3 * (probeVal / 255) : 0;
                ctx.strokeStyle = A((0.62 + probeLift) * (1 - idle * 0.45));
                ctx.lineWidth = 1;
                ctx.stroke();

                /* Quadrant ticks — the instrument reading. Faded in by
                   radius: on the small states they sat almost on top of the
                   ring and just read as noise. */
                const tick = Math.min(1, Math.max(0, (R - 18) / 8));
                if (tick > 0.01) {
                    ctx.strokeStyle = A(0.3 * tick);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let q = 0; q < 4; q++) {
                        const t = (q / 4) * Math.PI * 2 + Math.PI / 4;
                        const c = Math.cos(t);
                        const s = Math.sin(t);
                        ctx.moveTo(ox + c * (R + 4), oy + s * (R + 4));
                        ctx.lineTo(ox + c * (R + 7), oy + s * (R + 7));
                    }
                    ctx.stroke();
                }
            }

            /* ── Click impact ──
               The press spring gives the click a down-feel but no release;
               this is the note actually sounding. Ease-out so it leaves
               quickly rather than lingering. Max reach is R + 22, which with
               the largest ring and the snap lag stays inside the 100px
               canvas half. */
            const impactAge = now - impactAt;
            if (impactAge < IMPACT_MS) {
                const t = impactAge / IMPACT_MS;
                const e = 1 - Math.pow(1 - t, 3);
                ctx.beginPath();
                ctx.arc(ox, oy, R + 4 + e * 22, 0, Math.PI * 2);
                ctx.strokeStyle = A(0.5 * (1 - t));
                ctx.lineWidth = 0.5 + 1.5 * (1 - t);
                ctx.stroke();
            }

            // Charge arc for the SideNav easter egg.
            const age = now - chargeAt;
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

            /* Crosshair core, at the true pointer (0,0 after translate).
               12px across rather than 17 — at the old size it crowded the
               ring on the smaller states and read heavy instead of precise.
               Round caps because a 1px butt cap looks unfinished at this
               scale. */
            ctx.lineCap = "round";

            if (state === "caret") {
                /* Over plain text the crosshair would be the wrong tool, and
                   a crosshair mid-drag through a paragraph reads as a bug.
                   The ring is already collapsed (r: 0), so this bar IS the
                   cursor here. */
                ctx.beginPath();
                ctx.moveTo(0, -7);
                ctx.lineTo(0, 7);
                ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.strokeStyle = A(0.95);
                ctx.lineWidth = 1.25;
                ctx.stroke();
            } else {
                const arm = state === "game" ? CROSS_ARM * 2 : CROSS_ARM;
                const gap = arm / 2;
                ctx.beginPath();
                ctx.moveTo(-gap - arm, 0);
                ctx.lineTo(-gap, 0);
                ctx.moveTo(gap, 0);
                ctx.lineTo(gap + arm, 0);
                ctx.moveTo(0, -gap - arm);
                ctx.lineTo(0, -gap);
                ctx.moveTo(0, gap);
                ctx.lineTo(0, gap + arm);
                ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
                ctx.lineWidth = 2.5;
                ctx.stroke();
                ctx.strokeStyle = A(0.95);
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = A(1);
                ctx.beginPath();
                ctx.arc(0, 0, 1.4 * press, 0, Math.PI * 2);
                ctx.fill();
            }

            // Scrub gets explicit direction, since the seek bar is a drag.
            if (state === "scrub") {
                ctx.beginPath();
                ctx.moveTo(-22, 0);
                ctx.lineTo(-17, -4);
                ctx.moveTo(-22, 0);
                ctx.lineTo(-17, 4);
                ctx.moveTo(22, 0);
                ctx.lineTo(17, -4);
                ctx.moveTo(22, 0);
                ctx.lineTo(17, 4);
                ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
                ctx.lineWidth = 2.5;
                ctx.stroke();
                ctx.strokeStyle = A(0.9);
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.lineCap = "butt";

            /* ── Target lock ──
               Reuses the rect measured once at the top of the frame; the
               snap needs the same box, and getBoundingClientRect forces
               layout, so measuring it twice per frame would be waste. */
            const lockRect = spec.lock ? rect : null;
            if (lockRect) {
                if (!boxInit) {
                    box.x = lockRect.left;
                    box.y = lockRect.top;
                    box.w = lockRect.width;
                    box.h = lockRect.height;
                    boxInit = true;
                }
                box.x = lerp(box.x, lockRect.left, 0.22);
                box.y = lerp(box.y, lockRect.top, 0.22);
                box.w = lerp(box.w, lockRect.width, 0.22);
                box.h = lerp(box.h, lockRect.height, 0.22);
                box.o = lerp(box.o, 1, 0.2);
            } else {
                box.o = lerp(box.o, 0, 0.25);
                if (box.o < 0.02) boxInit = false;
            }

            /* Skip the whole write once the box is invisible, and only write
               width/height when they actually moved. Those two ARE layout
               properties — cheap here because the element is out of flow with
               nothing depending on it, but there is no reason to dirty layout
               every frame once the lock has settled on its target. */
            if (box.o > 0.001 || lockEl.style.opacity !== "0") {
                lockEl.style.opacity = box.o > 0.001 ? String(box.o) : "0";
                lockEl.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
                if (Math.abs(box.w - lastBoxW) > 0.5) {
                    lockEl.style.width = `${box.w}px`;
                    lastBoxW = box.w;
                }
                if (Math.abs(box.h - lastBoxH) > 0.5) {
                    lockEl.style.height = `${box.h}px`;
                    lastBoxH = box.h;
                }
            }

            /* ── Label ──
               The probe reads out position and, when the sample landed, the
               real mask value: `412, 96 · 184`. That number is the alpha
               channel GaitPipeline wrote the silhouette intensity into, so
               it is the data itself rather than a restatement of the tint. */
            let text = spec.label;
            if (state === "probe" && rect) {
                const px = Math.round(pointer.x - rect.left);
                const py = Math.round(pointer.y - rect.top);
                text =
                    probeVal !== null
                        ? `${px}, ${py} · ${probeVal}`
                        : `${px}, ${py}`;
            }
            if (label.textContent !== text) label.textContent = text;
            label.style.opacity = text ? "1" : "0";

            /* Follows the EASED position, not the raw one. Pinned to the raw
               pointer it snapped rigidly while the ring eased behind it, and
               the two read as unrelated objects.

               Flips to the left near the right edge, or the chip runs off
               screen — `READ CASE STUDY` is ~150px wide. */
            if (text) {
                const w = label.offsetWidth;
                const flip = eased.x > window.innerWidth - (w + 34);
                const lx = flip ? eased.x - w - 18 : eased.x + 18;
                const ly = Math.min(eased.y + 16, window.innerHeight - 34);
                label.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
            }

        };

        // ── Bind ────────────────────────────────────────
        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerover", onOver, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        document.addEventListener("mouseleave", onLeave);
        document.addEventListener("mouseenter", onEnter);
        window.addEventListener("cursor:charge", onCharge);

        /* Driven by gsap.ticker rather than its own requestAnimationFrame.
           This revises the earlier "plain rAF, never GSAP" note above: the
           concern there was coupling the cursor to SCROLL, and gsap.ticker is
           only a rAF multiplexer. Two loops racing each other — the ticker
           stepping Lenis and this one reading layout — was the worse outcome.

           The old visibilitychange handler is gone with it: the ticker is
           already rAF-backed, so a hidden tab stops calling it. */
        gsap.ticker.add(frame);

        return () => {
            gsap.ticker.remove(frame);
            html.classList.remove("cursor-custom");
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerover", onOver);
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            document.removeEventListener("mouseleave", onLeave);
            document.removeEventListener("mouseenter", onEnter);
            window.removeEventListener("cursor:charge", onCharge);
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

            {/* Hairline chip, built like the "+N more" badge on the project
                cards so it belongs to the existing system. Bare accent text
                was unreadable the moment it crossed a pale figure or a video
                frame. */}
            <span
                ref={labelRef}
                className="absolute top-0 left-0 px-2 py-1 rounded-full
                           bg-surface-0/90 backdrop-blur-sm border border-edge-strong
                           mono text-[0.625rem] leading-none tracking-[0.14em]
                           uppercase text-accent whitespace-nowrap opacity-0
                           transition-opacity duration-200"
                style={{ willChange: "transform" }}
            />
        </div>
    );
}
