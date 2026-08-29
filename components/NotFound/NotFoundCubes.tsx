"use client";

/* ══════════════════════════════════════════════════════
   404 — canvas and clock

   The untestable half. `digits.ts` owns every decision; this owns a canvas, a
   ticker and a ResizeObserver.

   ── It depends on nothing this page does not have ──
   No `onEntranceReady`, no `takeBurst`, no `ATLAS_QUIET_EVENT`, no
   `ScrollTrigger`, no atlas. `app/not-found.tsx` renders inside the root
   layout but a global unmatched URL may not pass through `app/template.tsx`,
   which is where `releaseEntrance()` fires — so anything gated on the
   entrance would wait forever and the page would simply never draw.

   `ScrollProvider` in the root layout already ran `registerGsap()` and is
   already stepping `gsap.ticker`, so the ticker is live here with no setup.

   ── THE RENDER RULE: fill the NEAREST FACE ONLY, stroke all six ──
   This is not a style choice and copying `ZoneTitle`'s loop wholesale breaks
   the page. At this pitch the far face projects at ~96.75% of the near one
   and they overlap over ~94% of their area, so six fills at 0.29 composite to
   0.872 coverage — which drives body text to 3.57:1, a WCAG failure that
   looks completely fine in review because the page renders and only the
   reading is hard. One fill measures 7.85:1, and 6.56:1 at the corner lift's
   peak. `digits.test.ts` asserts both directions.

   It is not a compromise visually either: one translucent fill with all six
   edges stroked over it reads as a glass box whose far edges show through,
   which at this size is a better read of "translucent block" than six stacked
   fills that just look solid.
   ══════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { gsap, registerGsap } from "@/lib/motion";
import { deviceTier, dprCap } from "@/lib/deviceTier";
import {
    nearness,
    orderedFaces,
    type Pose,
} from "../SignalGate/cubes";
import {
    ASSEMBLE_DELAY,
    ASSEMBLE_MS,
    ASSEMBLE_STAGGER,
    ASSEMBLE_TOTAL,
    DIGIT_CELLS,
    DIGITS_Z,
    FILL_BASE,
    FILL_NEAR,
    STROKE_BASE,
    STROKE_NEAR,
    alphaScale,
    anchorWorld,
    arriveAt,
    cornerLift,
    initialBounce,
    localProgress,
    rescaleBounce,
    screenRadius,
    seedScreen,
    slotPose,
    stepBounce,
    type Bounce,
} from "./digits";

/** The blocks' edge colour, matching the entrance and the zone title. */
const ICE = "187,225,250";

/**
 * Below this apparent half-width a cube paints its nearest face only and
 * skips the other five STROKES too.
 *
 * `ZoneTitle`'s value and its reasoning: at a few px across, six sorted
 * outlines are detail nobody can resolve costing six times the work. The
 * fill is already single (see the render rule); this only gates the strokes.
 */
const QUAD_BELOW = 9;

export default function NotFoundCubes() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        registerGsap();

        const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        const dpr = Math.min(
            window.devicePixelRatio || 1,
            2,
            dprCap(deviceTier()),
        );
        let w = 0;
        let h = 0;
        let bounce: Bounce | null = null;

        /* `.not-found-cubes` carries `color: var(--accent)`. Read once at
           mount and on resize, never per frame — the accent does not change
           on this route, and a per-frame `getComputedStyle` is a forced style
           resolution for a constant. */
        let edge = "50,130,184";
        const readAccent = () => {
            const rgb = getComputedStyle(canvas)
                .color.match(/[\d.]+/g)
                ?.slice(0, 3)
                .map(Number);
            if (rgb?.length === 3) edge = `${rgb[0]},${rgb[1]},${rgb[2]}`;
        };

        const size = () => {
            const r = canvas.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            if (Math.abs(r.width - w) < 0.5 && Math.abs(r.height - h) < 0.5) {
                return;
            }
            const prevW = w;
            const prevH = h;
            w = r.width;
            h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            /* Map the position through the viewport change by FRACTION of the
               free span. Absolute pixels would strand a word that was near
               the right edge outside a narrowed viewport, and the next step's
               clamp would snap it to the wall — a visible teleport. */
            bounce =
                bounce && prevW > 0 && prevH > 0
                    ? rescaleBounce(bounce, prevW, prevH, w, h)
                    : initialBounce(w, h);
        };

        /** One frame. `ms` is time since mount; `now` drives the corner clock. */
        const paint = (ms: number, state: Bounce) => {
            ctx.clearRect(0, 0, w, h);
            ctx.lineJoin = "round";
            ctx.lineWidth = 1;

            const anchor = anchorWorld(state.x, state.y, DIGITS_Z, w, h);
            const u = Math.min(
                1,
                Math.max(
                    0,
                    (ms - ASSEMBLE_DELAY) / (ASSEMBLE_STAGGER + ASSEMBLE_MS),
                ),
            );
            const scale = alphaScale(cornerLift(state, ms));

            /* Far to near across the word, so translucent cubes stack in the
               order the eye expects while they are still travelling. */
            const drawn: { pose: Pose; alpha: number }[] = [];
            for (let i = 0; i < DIGIT_CELLS.length; i++) {
                const slot = slotPose(i, anchor);
                const local = localProgress(u, DIGIT_CELLS[i].cx);
                drawn.push(arriveAt(i, slot, seedScreen(i, w, h), local, w, h));
            }
            drawn.sort((a, z) => z.pose.z - a.pose.z);

            for (const d of drawn) {
                if (d.alpha <= 0.004) continue;

        /* `orderedFaces` is the same projection and the same far-to-near
           sort this did inline, into buffers it reuses across calls. Per cube
           that was 8 points, 6 quad arrays, 6 face records and a six-element
           sort, all discarded before the next frame. `cubes.test.ts` asserts
           the two paths agree exactly, so this is an allocation removal and
           not a re-implementation.

           The result is SCRATCH SPACE and the next call overwrites it, which
           is why it is drawn from immediately and never stored. */
                const faces = orderedFaces(d.pose, w, h);

                const near = nearness(d.pose.z);
                const a = d.alpha * scale;

                const trace = (q: readonly { x: number; y: number }[]) => {
                    ctx.beginPath();
                    ctx.moveTo(q[0].x, q[0].y);
                    for (let k = 1; k < q.length; k++) {
                        ctx.lineTo(q[k].x, q[k].y);
                    }
                    ctx.closePath();
                };

                // ONE fill — the nearest face, which sorts last.
                trace(faces[faces.length - 1]);
                ctx.fillStyle = `rgba(${edge},${(FILL_BASE + near * FILL_NEAR) * a})`;
                ctx.fill();

                // All six edges over it, unless the cube is too small to resolve them.
                ctx.strokeStyle = `rgba(${ICE},${(STROKE_BASE + near * STROKE_NEAR) * a})`;
                const from =
                    screenRadius(d.pose, w, h) < QUAD_BELOW
                        ? faces.length - 1
                        : 0;
                for (let f = from; f < faces.length; f++) {
                    trace(faces[f]);
                    ctx.stroke();
                }
            }
        };

        /* Measure synchronously BEFORE observing. A ResizeObserver's first
           callback is delivered during the rendering steps, and a document
           that is not rendering never gets one — the canvas would sit at its
           300x150 default with every cube solved against a box that is not
           the one on screen. `CLAUDE.md` documents this trap at length. */
        size();
        readAccent();

        const ro = new ResizeObserver(() => {
            size();
            readAccent();
            /* Reduced motion has no ticker, so this is also what redraws the
               still frame if the first paint ran before the stylesheet
               applied. */
            if (reduced && w > 0 && bounce) paint(ASSEMBLE_TOTAL, bounce);
        });
        ro.observe(canvas);

        if (reduced) {
            /* One static frame and no ticker at all — `GlyphA`'s path. The
               word is fully assembled at its start position, which is upper
               left and clear of the copy column. The mark is still there,
               because it is the page's mark and not an animation. */
            if (w > 0 && bounce) paint(ASSEMBLE_TOTAL, bounce);
            return () => ro.disconnect();
        }

        let t0 = 0;
        let last = 0;

        const tick = (seconds: number) => {
            if (w < 1) size();
            if (w < 1 || !bounce) return;

            if (t0 === 0) t0 = seconds;
            const ms = (seconds - t0) * 1000;

            /* Both the step and the assembly read one clock, so they can
               never disagree. `stepBounce` clamps dt itself. */
            const dt = last === 0 ? 1 / 60 : seconds - last;
            last = seconds;

            bounce = stepBounce(bounce, dt, w, h, ms);
            paint(ms, bounce);
        };

        gsap.ticker.add(tick);

        /* rAF is paused in a hidden tab and hands back the whole absence as
           one frame. `stepBounce`'s clamp is the belt; this is the braces. */
        const onVisibility = () => {
            last = 0;
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            gsap.ticker.remove(tick);
            ro.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="not-found-cubes"
            aria-hidden="true"
            role="presentation"
        />
    );
}
