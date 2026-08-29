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
    nearness,
    orderedFaces,
    type Pose,
} from "../SignalGate/cubes";
import { getBreakpointMode } from "../LivingArchitecture/config";
import { deviceTier, dprCap } from "@/lib/deviceTier";
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
    wordScreenWidth,
    type Vec2,
} from "./word";

const ICE = "187,225,250";

/* ── The score, in fractions of the trigger's span ──

   Emerge, hold, disperse. The hold is the part that was wrong: at 0.45/0.62 it
   was 17% of an already-short span, so the word had barely finished assembling
   before it began to leave. It is nearly a third of the arc now, which is most
   of what "too fast" actually meant. */
const EMERGE_END = 0.42;
const DISPERSE_START = 0.72;

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

        const dpr = Math.min(
            window.devicePixelRatio || 1,
            2,
            dprCap(deviceTier()),
        );
        let w = 0;
        let h = 0;
        let sources: Vec2[] = [];

        /* `.zone-title-canvas`'s `color` is `var(--accent)`, and the zone's
           palette shift deliberately leaves the accent alone (see
           globals.css and CLAUDE.md — "the zone leaves the accent alone
           entirely"). So this string cannot change while the draw loop is
           running; reading it every frame was a forced style recalculation
           for a value that is, in practice, a constant for the session.
           Read once here and refreshed only where geometry already is
           (resize, ScrollTrigger refresh) rather than on the hot path. */
        let edge = "50,130,184";
        const readAccent = () => {
            const key = getComputedStyle(canvas).color;
            const rgb = key.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (rgb?.length === 3) edge = `${rgb[0]},${rgb[1]},${rgb[2]}`;
        };

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
        let fitted = false;
        const fitHeading = () => {
            if (!slotEl) return;
            const r = canvas.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            slotEl.style.minHeight = `${wordScreenHeight(r.width, r.height)}px`;
            fitted = true;
        };

        /* The heading's horizontal position and size do not change with
           scroll — only its vertical position does, and by exactly
           `window.scrollY`. Measuring `slotDocTop` (the document-relative
           top) once here and re-deriving the viewport-relative top from
           `scrollY` each frame is the same technique
           `LivingArchitecture.tsx`'s `attachScrub` uses for its anchors: it
           trades a forced-layout `getBoundingClientRect()` on every frame
           the word is animating for one arithmetic subtraction. */
        let slotLeft = 0;
        let slotWidth = 0;
        let slotHeight = 0;
        let slotDocTop = 0;
        const measureSlot = () => {
            if (!slotEl) return;
            const r = slotEl.getBoundingClientRect();
            if (r.width < 1) return;
            slotLeft = r.left;
            slotWidth = r.width;
            slotHeight = r.height;
            slotDocTop = r.top + window.scrollY;
        };

        /* ── Marking the heading only once this is really drawing ──
           `.work-head-title` is `color: transparent` under the choreographed
           media query, so if this canvas never paints the heading is invisible
           and the section reads as an empty band. That was reported, and a
           reload cleared it — the signature of a race, not of broken art.

           So the CSS now waits on `[data-cubes]` and this sets it, from inside
           the draw loop, on the first frame that actually puts ink down. Not
           at mount: mounting proves the chunk arrived, not that the geometry
           resolved. The failure direction is inverted — no canvas means you
           read the section title, which is the same discipline `Cursor.tsx`
           uses when it hides the native cursor only from the code that
           replaces it. */
        let marked = false;
        const markLive = () => {
            if (marked || !slotEl) return;
            marked = true;
            slotEl.dataset.cubes = "";
        };

        fitHeading();
        size();
        measureSlot();
        readAccent();

        let progress = 0;
        let blank = false;
        let last = 0;

        /* Refilled, never rebuilt. 80 cells means 80 pushes a frame either
           way, but reusing the array keeps its backing store instead of
           handing the collector a fresh 80-slot allocation sixty times a
           second. The poses inside it are still allocated by `slotPose` and
           friends — those live in the pure, unit-tested `word.ts` and are not
           worth reshaping for the ~320 small objects they cost. */
        const drawn: { pose: Pose; alpha: number }[] = [];

        const draw = () => {
            if (w < 1) size();
            if (w < 1 || !slotEl) return;

            /* ── RETRY UNTIL THIS CANVAS IS PROVEN, THEN NEVER AGAIN ──
               This is the reported bug. `measureSlot` and `fitHeading` run at
               mount and on refresh, and both BAIL if their element has no box
               yet — which is the case while the stylesheet is still landing,
               or before `#work` has been laid out. Nothing then asked again:
               the ResizeObserver watches this canvas, which is `100vw/100vh`
               fixed and does not resize when a heading finally gets its box.
               So one unlucky early measurement left `slotWidth` at 0 and the
               draw returning forever — with `.work-head-title` already
               transparent, which is why the section read as an empty band and
               why a reload cleared it.

               It sits ABOVE the progress early-out on purpose. The heading has
               to be marked as soon as the canvas is known-good, not when the
               reader first scrolls the word into range — mark it there and the
               DOM title would be visible on arrival and then blink out
               mid-animation.

               It costs one rect read per frame ONLY while unproven. Once
               marked, the early-out below is the first thing again, exactly as
               it was. */
            if (!marked) {
                if (slotWidth < 1) measureSlot();
                if (!fitted) fitHeading();
                if (slotWidth >= 1 && fitted) markLive();
            }

            // Early-out BEFORE any geometry read, for the same reason
            // GlyphA's is first: this ticker runs for the rest of the page.
            if (progress <= 0 || progress >= 1) {
                if (!blank) {
                    blank = true;
                    ctx.clearRect(0, 0, w, h);
                }
                return;
            }
            blank = false;

            if (slotWidth < 1) return;

            /* ── LEFT-ALIGNED, NOT CENTRED IN THE COLUMN ──
               This used to anchor on `box.left + box.width / 2`. The box is the
               full content column and the word is narrower than it, so the word
               sat centred inside it — indented about 49px at 1440 while the
               eyebrow above and the lead below both started hard against the
               column's left edge. Three things that should share a margin, and
               one of them did not.

               Anchoring on the word's own half-width puts its INK edge on the
               column edge, which is what "aligned" means for type. The
               vertical stays centred because `fitHeading` has already given
               the box the word's exact height.

               `slotTop` is `slotDocTop - scrollY` rather than a fresh
               `getBoundingClientRect()` — see `measureSlot` above. */
            const slotTop = slotDocTop - window.scrollY;
            const anchor = anchorWorld(
                slotLeft + wordScreenWidth(w, h) / 2,
                slotTop + slotHeight / 2,
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

            drawn.length = 0;
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
                /* `orderedFaces` is the same projection and the same
                   far-to-near sort `renderCube` does, into buffers it reuses
                   — 80 cubes a frame was ~1,600 objects and 80 six-element
                   sorts, all of it discarded before the next frame.
                   `cubes.test.ts` asserts the two agree exactly, so this is a
                   pure allocation removal rather than a re-implementation.

                   The result is scratch space: draw from it before the next
                   call, which the loop below does. */
                const faces = orderedFaces(d.pose, w, h);

                // The nearest face last; below the threshold it is the only one.
                const from =
                    screenRadius(d.pose, w, h) < QUAD_BELOW ? faces.length - 1 : 0;
                const near = nearness(d.pose.z);

                for (let f = from; f < faces.length; f++) {
                    const q = faces[f];
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
            measureSlot();
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

               THERE IS A CEILING ON THIS, and it is worth knowing before
               reaching for a bigger number. The word is drawn at the heading's
               LIVE screen position, so it scrolls out of view after roughly
               `vh + header height` whatever the trigger says. Past that the
               phases play off the top of the screen.

               1.3, NOT 1.7. The span and the curve are two different levers and
               they were confused once already. 1.3x here is about 1.5x the
               original 799px arc — the duration that felt right — while
               `settle` in `word.ts` separately halves the peak rate, which is
               what removed the snap. Stacking a 1.7x span ON TOP of the gentler
               curve made the whole thing roughly four times slower and it
               dragged. Duration is this number; smoothness is that one.

               `top 90%` rather than `top bottom` so the word is already a
               little way into view before it starts assembling, instead of
               forming on the bottom edge.

               Running past the header into the zone is deliberate and safe.
               The disperse targets are `atlasSources` — the core and stage-2
               branch endpoints, all right of `52vw` — while the zone's content
               now sits left of it. The cubes travel away from the copy, into
               the diagram they came out of. */
            trigger:
                document.querySelector<HTMLElement>(".work-head") ??
                slotEl ??
                canvas,
            start: "top 90%",
            end: () => `+=${Math.round(window.innerHeight * 1.3)}`,
            scrub: true,
            invalidateOnRefresh: true,
            onRefresh: () => {
                fitHeading();
                size();
                measureSlot();
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
            /* Hand the heading back. `[data-cubes]` is what makes it
               transparent, so leaving it behind on a torn-down canvas would
               strand an invisible title — the exact failure this attribute was
               added to prevent, reintroduced by its own cleanup. */
            if (slotEl) delete slotEl.dataset.cubes;
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
