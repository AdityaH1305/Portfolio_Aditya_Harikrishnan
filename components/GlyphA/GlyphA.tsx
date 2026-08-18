"use client";

/* ══════════════════════════════════════════════════════
   The A — canvas, clock and pointer

   The untestable half. `glyph.ts` next door owns every
   decision; this owns a canvas, a ticker and a drag.

   ── What it does, in order ──
   1. Waits for `onEntranceReady`. Nothing is drawn before
      that, which on a gated load is the burst — so the
      first frame here is the frame the gate stopped on.
   2. Flies the 27 fragments out and home into the letter.
   3. Holds the letter: swaying, shying from the cursor,
      draggable.
   4. Takes it apart into the atlas as the hero scrolls by.

   ── Why it is not part of LivingArchitecture ──
   That engine is 1470 lines, hard-clips every draw to the
   right 48% of the viewport, has no pointer surface at all,
   and its only continuous input is a blended `StageConfig`.
   A letter is not expressible as a `StageConfig`, so living
   there would mean either a synthetic prelude stage — which
   breaks the `SECTION_IDS[i] ↔ STAGES[i]` contract three
   files depend on — or a second compositing channel through
   an already-dense engine.

   ── Two canvases must never animate at once ──
   The repo's rule, and this respects it rather than
   working around it: the atlas is held quiet by source
   while the letter is on screen and released as the cubes
   dissolve into it. That is also better choreography than
   the alternative — the atlas sits near-empty while the A
   owns the screen, and comes to life exactly as the letter
   feeds it. `setProgress` keeps updating targets while
   paused, so it walks in from wherever the reader has
   scrolled to rather than snapping.
   ══════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";
import { onEntranceReady } from "@/lib/entrance";
import { takeBurst } from "@/lib/handoff";
import { ATLAS_QUIET_EVENT } from "@/lib/zone";
import {
    CUBE_FACES,
    CUBE_VERTS,
    faceDepth,
    nearness,
    project,
    type Pose,
} from "../SignalGate/cubes";
import { shatter, type Fragment } from "../SignalGate/finale";
import { getBreakpointMode, CORE_POSITIONS } from "../LivingArchitecture/config";
import {
    ASSEMBLE_MS,
    FLY_OUT,
    LETTER_CELLS,
    LETTER_Z,
    NO_OFFSET,
    SPIN_REST,
    anchorWorld,
    atlasTargets,
    cellSizeFor,
    flyAt,
    letterBounds,
    morphAt,
    offsetToWorld,
    repelOffset,
    screenOf,
    slotPose,
    spinAt,
    swayAt,
    targetForCell,
    type Spin,
    type Vec2,
} from "./glyph";

/* The blocks' edge colour, and the same literal the gate carries for the same
   reason: the canvas's own `color` already hands the loop the accent, and an
   element cannot supply two. Faces are derived from that one; this is the
   highlight. Matches `--text-primary`. */
const ICE = "187,225,250";

/** Our key in the atlas's pause-reason set. */
const QUIET_SOURCE = "glyph";

/* ── The morph window ──────────────────────────────────
   As fractions of the hero's own scroll span — 0 at the top of the document,
   1 where the atlas reaches stage 1.

   THE SPAN IS SHORTER THAN IT LOOKS, and that is what these numbers are
   really tuned against. `#research`'s anchor sits its own top minus 40vh, so
   on a 1440x900 desktop the whole 0…1 range is 432px of scroll — well under
   half a viewport, even though the hero itself is a full one.

   At 0.06…0.62 the morph therefore finished inside 242px, about two wheel
   notches, and the letter did not evolve into anything so much as cut to it.
   The zone's own pacing notes make the same point in the other direction: a
   hop over five notches is a dissolve you can watch and one over a single
   notch is a jump cut.

   0.08…0.95 spends 375px, near enough four notches, and uses almost all the
   run the atlas gives it. Widening further means reaching past stage 1, where
   there is no letter left to spend. */
const MORPH_START = 0.08;
const MORPH_END = 0.95;

/** Where in the morph the atlas is allowed to start moving again. */
const QUIET_RELEASE = 0.55;

/** Past this on load, the reader was restored below the hero. */
const SKIP_ABOVE = MORPH_END;

/** Drag needs a real pointer. Touch selects and scrolls; it never drags. */
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export default function GlyphA() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hitRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const hit = hitRef.current;
        if (!canvas || !hit) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        registerGsap();

        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        /* ── Size ──────────────────────────────────────
           The belt-and-braces `SkillOrbit` documents: measure synchronously
           at mount, then observe, and re-offer the box on pointerdown.

           A ResizeObserver is delivered during the event loop's rendering
           steps — the same steps rAF runs in — so a document that is not
           currently rendering never gets one, and relying on it for the FIRST
           size leaves the canvas at its 300×150 default while CSS lays it out
           full-bleed. The mount measurement alone is not enough either: if
           the stylesheet has not applied the box is degenerate, `size()`
           rejects it, and with both the observer and rAF stopped nothing ever
           asks again. */
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0;
        let h = 0;
        let anchor: Vec2 = { x: 0, y: 0 };
        let targets: Pose[] = [];

        const size = () => {
            const r = canvas.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            if (Math.abs(r.width - w) < 0.5 && Math.abs(r.height - h) < 0.5) return;

            w = r.width;
            h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            /* The letter stands where the atlas core will be, so the morph is
               a collapse into that exact point rather than a handover between
               two places. */
            const mode = getBreakpointMode(window.innerWidth);
            const core = CORE_POSITIONS[mode];
            anchor = anchorWorld(core.x * w, core.y * h, LETTER_Z, w, h);

            targets = atlasTargets(w, h, mode).map((t) => {
                const world = anchorWorld(t.x, t.y, LETTER_Z, w, h);
                return {
                    ...world,
                    z: LETTER_Z,
                    rx: 0,
                    ry: 0,
                    size: cellSizeFor() * 0.2,
                };
            });
        };
        size();

        /* ── Scroll ────────────────────────────────────
           MIRRORS `attachScrub` IN LivingArchitecture.tsx, deliberately and
           by hand: `#research`'s top, minus 40% of the viewport, is where the
           atlas's own progress reaches 1. The formula is written twice and
           the two must stay in step — drift and the letter finishes its morph
           at a different scroll position than the atlas expects to receive it.

           There is no shared helper because the atlas's copy is a closure
           over seven anchors and this needs exactly one of them. */
        let heroEnd = window.innerHeight;
        let progress = 0;

        const measure = () => {
            const el = document.getElementById("research");
            const end = el
                ? el.getBoundingClientRect().top +
                  window.scrollY -
                  window.innerHeight * 0.4
                : window.innerHeight;
            heroEnd = end > 1 ? end : window.innerHeight;
        };

        const readProgress = () => {
            const p = window.scrollY / heroEnd;
            return p < 0 ? 0 : p > 1 ? 1 : p;
        };

        /* ── The letter's state ────────────────────────
           All of it in closure locals, none in React state. The loop runs on
           gsap.ticker at 60fps and a state update per frame would be sixty
           renders a second of a component holding a canvas — the same reason
           the gate keeps its finale clock in a ref. */
        let frags: Fragment[] = [];
        let startedAt = 0;
        let running = false;
        let spin: Spin = SPIN_REST;
        const offsets: Vec2[] = LETTER_CELLS.map(() => NO_OFFSET);
        let pointer: Vec2 | null = null;
        let dragging = false;
        let dragX = 0;
        let dragY = 0;
        let dragDX = 0;
        let dragDY = 0;
        let last = 0;
        let quietHeld = false;
        let inFront = false;
        let blank = false;

        /* ── Which layer the letter is on ──
           IN FRONT WHILE IT IS FLYING, BEHIND ONCE IT LANDS, and the two are
           different jobs. The flight is the tail of the entrance: Hero's
           SplitText timeline is still running, and the point of releasing at
           the burst is that you watch the site arrive THROUGH the wreckage —
           which only works if the wreckage is over it.

           A letter standing still is not wreckage, it is background, and it
           goes behind the copy like every other ambient system. That also
           settles the phone case, where the hero column is full width and the
           letter has nowhere to stand that is not behind text. */
        const setFront = (want: boolean) => {
            if (want === inFront) return;
            inFront = want;
            canvas.classList.toggle("is-front", want);
        };

        const setQuiet = (want: boolean) => {
            if (want === quietHeld) return;
            quietHeld = want;
            window.dispatchEvent(
                new CustomEvent(ATLAS_QUIET_EVENT, {
                    detail: { source: QUIET_SOURCE, quiet: want },
                }),
            );
        };

        /* ── Painting ──────────────────────────────────
           The gate's own `paint`, because the letter must be made of visibly
           the same material as the blocks it came from. The key colour is
           read from the element's computed `color` every frame rather than
           held as a literal, so the canvas and the stylesheet cannot drift. */
        const facesOf = (pose: Pose) => {
            const pts = CUBE_VERTS.map((v) => project(v, pose, w, h));
            return CUBE_FACES.map((idx) => {
                const quad = idx.map((i) => pts[i]);
                return { pts: quad, depth: faceDepth(quad) };
            }).sort((a, b) => b.depth - a.depth);
        };

        const paint = (
            faces: readonly { pts: readonly { x: number; y: number }[] }[],
            near: number,
            edge: string,
            alpha: number,
        ) => {
            if (alpha <= 0.004) return;
            for (const f of faces) {
                ctx.beginPath();
                ctx.moveTo(f.pts[0].x, f.pts[0].y);
                for (let i = 1; i < f.pts.length; i++) {
                    ctx.lineTo(f.pts[i].x, f.pts[i].y);
                }
                ctx.closePath();
                ctx.fillStyle = `rgba(${edge},${(0.12 + near * 0.26) * alpha})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(${ICE},${(0.16 + near * 0.3) * alpha})`;
                ctx.stroke();
            }
        };

        const clear = () => ctx.clearRect(0, 0, w, h);

        /* ── One frame ─────────────────────────────────
           Three regimes, chosen by the clock and the scroll rather than by
           React state: the flight home, the letter at rest, and the morph. */
        const draw = (seconds: number) => {
            if (w < 1) size();
            if (w < 1) return;

            const dt = last === 0 ? 1 / 60 : seconds - last;
            last = seconds;

            progress = readProgress();
            const m =
                (progress - MORPH_START) / (MORPH_END - MORPH_START);
            const morph = m < 0 ? 0 : m > 1 ? 1 : m;

            setQuiet(morph < QUIET_RELEASE);

            /* ── Gone ──
               AND THE EARLY-OUT COMES BEFORE THE STYLE READ, which is the
               only reason it is worth anything. This ticker keeps running for
               the entire rest of the page — the reader is six sections down
               and the letter dissolved long ago — so a `getComputedStyle`
               above this line is a forced style resolution on every frame of
               a session, for a canvas that draws nothing.

               It is not `gsap.ticker.remove`, because the reader can scroll
               back up and the letter has to be there when they do. Cleared
               once on the way out rather than every frame, for the same
               reason. */
            if (morph >= 1) {
                if (!blank) {
                    blank = true;
                    clear();
                    hit.style.width = "0px";
                    hit.style.height = "0px";
                    setFront(false);
                }
                return;
            }
            blank = false;

            const key = getComputedStyle(canvas).color;
            const rgb = key.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (rgb?.length !== 3) return;
            const edge = `${rgb[0]},${rgb[1]},${rgb[2]}`;

            clear();
            ctx.lineJoin = "round";
            ctx.lineWidth = 1;

            const u = (performance.now() - startedAt) / ASSEMBLE_MS;

            /* ── The flight ── */
            setFront(u < 1);
            if (u < 1) {
                const pieces = frags.map((f, i) => {
                    const slot = slotPose(i, anchor, spin.rx, swayAt(seconds));
                    return flyAt(f, slot, u);
                });
                for (const d of [...pieces].sort((a, z) => z.pose.z - a.pose.z)) {
                    paint(facesOf(d.pose), nearness(d.pose.z), edge, d.alpha);
                }
                hit.style.width = "0px";
                hit.style.height = "0px";
                return;
            }

            /* ── At rest, and on the way out ── */
            spin = spinAt(spin, dt, dragging ? { dx: dragDX, dy: dragDY } : null);
            dragDX = 0;
            dragDY = 0;

            const ry = swayAt(seconds) + spin.ry;
            const drawn: { pose: Pose; alpha: number }[] = [];
            const rest: Pose[] = [];

            for (let i = 0; i < LETTER_CELLS.length; i++) {
                const slot = slotPose(i, anchor, spin.rx, ry);

                /* The shove is measured in screen pixels — "near the cursor"
                   is a screen fact — and converted back to world units at the
                   cube's own depth, or the same push would cover more of the
                   letter at the front than at the back. */
                const at = screenOf(slot, w, h);
                offsets[i] = repelOffset(offsets[i], at, pointer, dt);
                const off = offsetToWorld(offsets[i], slot.z, w, h);
                const pose: Pose = {
                    ...slot,
                    x: slot.x + off.x,
                    y: slot.y + off.y,
                };
                rest.push(pose);

                drawn.push(
                    morph > 0
                        ? morphAt(pose, targets[targetForCell(i, targets.length)], morph)
                        : { pose, alpha: 1 },
                );
            }

            for (const d of [...drawn].sort((a, z) => z.pose.z - a.pose.z)) {
                paint(facesOf(d.pose), nearness(d.pose.z), edge, d.alpha);
            }

            /* ── The hit box ──
               The letter's own bounds, not the viewport. The canvas stays
               `pointer-events: none` and this is the only thing that takes a
               pointer, so nothing on the page can be swallowed by a
               full-bleed overlay — and it withdraws the moment the letter
               starts leaving, so a reader scrolling past never drags it by
               accident. */
            if (morph < 0.2) {
                const b = letterBounds(rest, w, h);
                hit.style.left = `${b.x}px`;
                hit.style.top = `${b.y}px`;
                hit.style.width = `${b.w}px`;
                hit.style.height = `${b.h}px`;
            } else {
                hit.style.width = "0px";
                hit.style.height = "0px";
            }
        };

        /* ── Static frame, for a reader who asked for less motion ──
           The letter, once, at rest, and then opacity only as the hero
           scrolls by. No flight, no sway, no shove — but the mark is still
           there, because it is the page's mark and not an animation. */
        const drawStatic = () => {
            if (w < 1) size();
            if (w < 1) return;
            const key = getComputedStyle(canvas).color;
            const rgb = key.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (rgb?.length !== 3) return;
            const edge = `${rgb[0]},${rgb[1]},${rgb[2]}`;

            clear();
            ctx.lineJoin = "round";
            ctx.lineWidth = 1;

            const poses = LETTER_CELLS.map((_, i) =>
                slotPose(i, anchor, SPIN_REST.rx, 0),
            );
            for (const p of [...poses].sort((a, z) => z.z - a.z)) {
                paint(facesOf(p), nearness(p.z), edge, 1);
            }
        };

        /* ── Pointer ───────────────────────────────────
           Position is tracked on the window because the shove reaches further
           than the letter does; the drag lives on the hit box, which can take
           `setPointerCapture` and cannot start a text selection in the hero. */
        const onMove = (e: PointerEvent) => {
            pointer = { x: e.clientX, y: e.clientY };
        };
        const onLeave = () => {
            pointer = null;
        };

        const onDown = (e: PointerEvent) => {
            size();
            // Touch selects and scrolls. It never drags — the rule the orbit
            // field documents, and this repo has shipped an unscrollable page.
            if (!window.matchMedia(FINE_POINTER).matches) return;
            hit.setPointerCapture(e.pointerId);
            dragging = true;
            dragX = e.clientX;
            dragY = e.clientY;
            dragDX = 0;
            dragDY = 0;
            document.documentElement.classList.add("glyph-dragging");
        };

        const onDrag = (e: PointerEvent) => {
            if (!dragging) return;
            dragDX += e.clientX - dragX;
            dragDY += e.clientY - dragY;
            dragX = e.clientX;
            dragY = e.clientY;
        };

        const onUp = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            document.documentElement.classList.remove("glyph-dragging");
            if (hit.hasPointerCapture(e.pointerId)) {
                hit.releasePointerCapture(e.pointerId);
            }
        };

        /* ── Start ─────────────────────────────────────
           Nothing runs until the entrance releases. On a gated load that is
           the burst, so the first frame drawn here is the frame the gate
           stopped on. */
        let tick: ((t: number) => void) | null = null;
        let ro: ResizeObserver | null = null;

        const begin = () => {
            measure();

            /* Restored below the hero — a reader returning to a scroll
               position halfway down the page. Assembling a letter off-screen
               is frames spent on something nobody will see, and holding the
               atlas quiet for it would be worse. */
            if (readProgress() >= SKIP_ABOVE) return;

            const burst = takeBurst();
            frags = burst ? [...burst.fragments] : shatter(Math.random);

            /* ONE CODE PATH, TWO ENTRANCES. A gated visitor's clock starts at
               the burst, so the flight opens on the intact merged cube the
               gate was drawing a frame earlier. Everyone else starts at the
               TURN — the same arithmetic, wound forward past the outward leg
               — so the letter gathers itself out of a scatter instead of a
               cube materialising in the middle of the hero copy. */
            startedAt = burst
                ? burst.at
                : performance.now() - FLY_OUT * ASSEMBLE_MS;

            running = true;
            setQuiet(true);

            ro = new ResizeObserver(() => {
                size();
                if (reduced) drawStatic();
            });
            ro.observe(canvas);

            if (reduced) {
                /* No ticker at all. Progress only changes the opacity, which
                   is not motion in the sense the preference is about. */
                drawStatic();
                return;
            }

            tick = (t: number) => draw(t);
            gsap.ticker.add(tick);
            window.addEventListener("pointermove", onMove, { passive: true });
            window.addEventListener("pointerleave", onLeave);
            hit.addEventListener("pointerdown", onDown);
            hit.addEventListener("pointermove", onDrag);
            hit.addEventListener("pointerup", onUp);
            hit.addEventListener("pointercancel", onUp);
        };

        const unsubscribe = onEntranceReady(begin);

        const st = ScrollTrigger.create({
            start: 0,
            end: "max",
            scrub: true,
            onRefresh: () => {
                measure();
                size();
                if (reduced && running) drawStatic();
            },
            onUpdate: () => {
                if (!reduced || !running) return;
                /* Reduced motion has no loop, so the fade is applied here and
                   the letter is never redrawn. */
                const m =
                    (readProgress() - MORPH_START) / (MORPH_END - MORPH_START);
                const o = 1 - (m < 0 ? 0 : m > 1 ? 1 : m);
                canvas.style.opacity = `${o}`;
                setQuiet(o > 0.2);
            },
        });

        const onVisibility = () => {
            // rAF stops in a hidden tab; the accumulated gap would otherwise
            // arrive as one enormous frame.
            last = 0;
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            unsubscribe();
            st.kill();
            if (tick) gsap.ticker.remove(tick);
            ro?.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerleave", onLeave);
            hit.removeEventListener("pointerdown", onDown);
            hit.removeEventListener("pointermove", onDrag);
            hit.removeEventListener("pointerup", onUp);
            hit.removeEventListener("pointercancel", onUp);
            document.documentElement.classList.remove("glyph-dragging");
            canvas.classList.remove("is-front");
            /* A glyph torn down mid-morph must not strand the atlas asleep —
               the same reason the gate reverts the cursor tint in a cleanup
               rather than in `close()`. */
            setQuiet(false);
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="glyph-a-canvas"
                aria-hidden="true"
                role="presentation"
            />
            <div
                ref={hitRef}
                className="glyph-a-hit"
                data-cursor="probe"
                aria-hidden="true"
            />
        </>
    );
}
