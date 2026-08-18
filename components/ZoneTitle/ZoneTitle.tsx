"use client";

/* ══════════════════════════════════════════════════════
   PROJECTS — canvas and clock

   The untestable half. `word.ts` owns every decision; this
   owns a canvas, a ticker and a scroll trigger.

   Cubes come out of the atlas, spell the section's title,
   and fall back into it as the reader scrolls into the case
   studies. It closes the loop the entrance opened: the same
   material went INTO the diagram at the hero, and some of it
   comes back out here.

   ── It does NOT hold `atlas:quiet`, and that is deliberate ──
   The repo's rule is that two canvases must never animate at
   once, and every other consumer honours it. This one is a
   knowing exception, for one reason: the atlas is the whole
   point of this section now, so pausing it to run the title
   would defeat the change it is decorating. The cubes are
   supposed to be seen coming out of a diagram that is moving.

   What pays for it: ~80 cubes drawn as ONE quad each rather
   than six sorted faces (see `QUAD_BELOW`), a window bounded
   by scroll rather than left running, and an early-out that
   costs nothing once the word is gone. The atlas's own
   performance governor now covers this region too.
   ══════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";
import {
    CUBE_FACES,
    CUBE_VERTS,
    faceDepth,
    nearness,
    project,
    type Pose,
} from "../SignalGate/cubes";
import { getBreakpointMode } from "../LivingArchitecture/config";
import {
    WORD_CELLS,
    WORD_Z,
    anchorWorld,
    atlasSources,
    disperseAt,
    emergeAt,
    localProgress,
    screenRadius,
    seedPose,
    slotPose,
    sourceForCell,
    wordScreenHeight,
    type Vec2,
} from "./word";

const ICE = "187,225,250";

/* ── The score, in fractions of the trigger's span ──

   Emerge, hold, disperse. The hold is the part that was wrong: at 0.45/0.62 it
   was 17% of an already-short span, so the word had barely finished assembling
   before it began to leave. It is nearly a third of the arc now, which is most
   of what "too fast" actually meant. */
const EMERGE_END = 0.4;
const DISPERSE_START = 0.68;

/**
 * Below this apparent half-width, a cube paints its NEAREST FACE ONLY.
 *
 * At ~6px across, six translucent faces sorted back-to-front is detail nobody
 * can resolve costing six times the fill rate. One quad is visually identical
 * at this size and takes ~80 fills a frame instead of ~480 — cheaper than the
 * entrance's 27 full cubes, which is what makes running alongside the atlas
 * defensible at all.
 */
const QUAD_BELOW = 9;

/** Match the zone's own gate: no canvas where the layout is not choreographed. */
const CHOREOGRAPHED =
    "(min-width: 1024px) and (prefers-reduced-motion: no-preference) and (scripting: enabled)";

export default function ZoneTitle() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (!window.matchMedia(CHOREOGRAPHED).matches) return;

        registerGsap();

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0;
        let h = 0;
        let sources: Vec2[] = [];

        const size = () => {
            const r = canvas.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            if (Math.abs(r.width - w) < 0.5 && Math.abs(r.height - h) < 0.5) return;
            w = r.width;
            h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            sources = atlasSources(w, h, getBreakpointMode(window.innerWidth));
        };

        /* The word is anchored to the heading's own box and re-read every
           frame, so it scrolls with the page rather than being pinned to the
           viewport. The heading is visually hidden under this breakpoint —
           the canvas IS its rendering — but it is still laid out, which is
           what makes it a usable anchor and what keeps the section's real
           <h2> in the accessibility tree. */
        const slotEl = document.querySelector<HTMLElement>("[data-zone-title]");

        /* GIVE THE HEADING THE WORD'S OWN HEIGHT.

           Set from `word.ts` rather than in CSS so the number cannot drift,
           and set OUTSIDE `size()` so it lands on the first pass whether or
           not the canvas needed resizing. It runs before the ScrollTrigger is
           created, so the trigger measures the final layout.

           Nothing sets it where the canvas does not mount — reduced motion,
           no JS, a narrow screen — and that is correct: there is no word being
           drawn there, so the heading should be its own natural size. */
        const fitHeading = () => {
            if (!slotEl) return;
            slotEl.style.minHeight = `${wordScreenHeight(window.innerWidth)}px`;
        };
        fitHeading();
        size();

        let progress = 0;
        let blank = false;
        let last = 0;

        const draw = () => {
            if (w < 1) size();
            if (w < 1 || !slotEl) return;

            // Early-out BEFORE any style read, for the same reason GlyphA's is
            // first: this ticker runs for the rest of the page.
            if (progress <= 0 || progress >= 1) {
                if (!blank) {
                    blank = true;
                    ctx.clearRect(0, 0, w, h);
                }
                return;
            }
            blank = false;

            const key = getComputedStyle(canvas).color;
            const rgb = key.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (rgb?.length !== 3) return;
            const edge = `${rgb[0]},${rgb[1]},${rgb[2]}`;

            const box = slotEl.getBoundingClientRect();
            if (box.width < 1) return;
            const anchor = anchorWorld(
                box.left + box.width / 2,
                box.top + box.height / 2,
                WORD_Z,
                w,
                h,
            );

            ctx.clearRect(0, 0, w, h);
            ctx.lineJoin = "round";
            ctx.lineWidth = 1;

            const out =
                progress > DISPERSE_START
                    ? (progress - DISPERSE_START) / (1 - DISPERSE_START)
                    : 0;
            const inU = Math.min(1, progress / EMERGE_END);

            const drawn: { pose: Pose; alpha: number }[] = [];
            for (let i = 0; i < WORD_CELLS.length; i++) {
                const slot = slotPose(i, anchor, w, h);
                const seed = seedPose(
                    sources[sourceForCell(i, sources.length)],
                    slot,
                    w,
                    h,
                );
                drawn.push(
                    out > 0
                        ? disperseAt(slot, seed, localProgress(out, WORD_CELLS[i].glyph))
                        : emergeAt(seed, slot, localProgress(inU, WORD_CELLS[i].glyph)),
                );
            }

            // Far to near across the word, so translucent cubes stack in the
            // order the eye expects while they are travelling.
            drawn.sort((a, z) => z.pose.z - a.pose.z);

            for (const d of drawn) {
                if (d.alpha <= 0.004) continue;
                const pts = CUBE_VERTS.map((v) => project(v, d.pose, w, h));
                const faces = CUBE_FACES.map((idx) => {
                    const quad = idx.map((k) => pts[k]);
                    return { pts: quad, depth: faceDepth(quad) };
                }).sort((a, b) => b.depth - a.depth);

                // The nearest face last; below the threshold it is the only one.
                const from =
                    screenRadius(d.pose, w, h) < QUAD_BELOW ? faces.length - 1 : 0;
                const near = nearness(d.pose.z);

                for (let f = from; f < faces.length; f++) {
                    const q = faces[f].pts;
                    ctx.beginPath();
                    ctx.moveTo(q[0].x, q[0].y);
                    for (let k = 1; k < q.length; k++) ctx.lineTo(q[k].x, q[k].y);
                    ctx.closePath();
                    ctx.fillStyle = `rgba(${edge},${(0.14 + near * 0.3) * d.alpha})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(${ICE},${(0.18 + near * 0.34) * d.alpha})`;
                    ctx.stroke();
                }
            }
        };

        const tick = () => draw();
        gsap.ticker.add(tick);

        const ro = new ResizeObserver(() => {
            fitHeading();
            size();
        });
        ro.observe(canvas);

        const st = ScrollTrigger.create({
            /* ── THE SPAN, AND WHY IT IS AN EXPLICIT LENGTH ──
               This used to trigger on the `<h2>` with `top 92%` / `bottom 8%`,
               and that element is ~43px tall — so the whole arc was
               `0.84 x vh + 43`, about 799px. Split by the score, and with the
               stagger and the easing each taking their share, a letter had
               roughly 130px to travel in. One wheel notch, which is what made
               it snap rather than assemble.

               The header block is the honest trigger, and the end is a flat
               pixel length rather than an alignment for the same reason
               `.zone-scroll` uses `400vh`: one number in one place, and it does
               not quietly change when the heading rewraps.

               Running past the header into the zone is deliberate and safe.
               The disperse targets are `atlasSources` — the core and stage-2
               branch endpoints, all right of `52vw` — while the zone's content
               now sits left of it. The cubes travel away from the copy, into
               the diagram they came out of. */
            trigger:
                document.querySelector<HTMLElement>(".work-head") ??
                slotEl ??
                canvas,
            start: "top bottom",
            end: () => `+=${Math.round(window.innerHeight * 1.3)}`,
            scrub: true,
            invalidateOnRefresh: true,
            onRefresh: () => {
                fitHeading();
                size();
            },
            onUpdate: (self) => {
                progress = self.progress;
            },
        });

        const onVisibility = () => {
            last = 0;
        };
        document.addEventListener("visibilitychange", onVisibility);
        void last;

        return () => {
            gsap.ticker.remove(tick);
            ro.disconnect();
            st.kill();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="zone-title-canvas"
            aria-hidden="true"
            role="presentation"
        />
    );
}
