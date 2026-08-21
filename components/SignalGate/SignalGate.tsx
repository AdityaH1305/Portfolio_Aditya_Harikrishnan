"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { gsap } from "@/lib/motion";
import { getLenis, lockScroll, unlockScroll } from "@/lib/lenis";
import { claimEntrance, releaseEntrance } from "@/lib/entrance";
import { publishBurst } from "@/lib/handoff";
import { ATLAS_QUIET_EVENT, CURSOR_TINT_EVENT } from "@/lib/zone";
import {
    GATE_KEY,
    TTL_MS,
    encodeClearance,
    shouldShowGate,
    BURST_AT,
    CONVERGE_AT,
    CONVERGE_MS,
    EXIT_MS,
    FINALE_MS,
} from "./gate";
import { ecgAt, sweepAt, ECG_SAMPLES } from "./ecg";
import {
    CUBE_FACES,
    CUBE_VERTS,
    collisionRadius,
    depthAt,
    envFor,
    faceDepth,
    nearness,
    project,
    renderCube,
    spawnField,
    type Cube,
    type Pose,
} from "./cubes";
import { stepField } from "./forces";
import { ARRIVE_TOTAL, arriveAt } from "./arrival";
import { convergeAt, poseOf, shatter, type Fragment } from "./finale";

/* The blocks' edge colour. Ice, against accent-blue faces — the pair is what
   makes them read as lit glass rather than as wireframe. Written here because
   the canvas's own `color` already carries the accent and an element cannot
   hand a draw loop two colours; the fill is derived from that one, this is the
   highlight. Same value as `--text-primary`. */
const ICE = "187,225,250";

/* ══════════════════════════════════════════════════════
   Signal Gate — the entrance

   A station that is up and waiting for you. One control
   connects, and that connection is what starts everything:
   the console line prints, the atlas wakes out of its dormant
   core, and the page is handed over.

   ── It used to be a fault, and that was the mistake ──
   The premise was "signal lost": a red room, an alarm
   palette, a flatlined monitor and copy that talked the
   reader down from it. Three rounds of rewriting could not
   fix the one problem it had, which is that RECRUITERS READ
   IT AS BROKEN — because the loudest two things on the screen
   were not words at all. Red is an alarm and a flat line is
   no pulse, and no amount of calm type argues with either.

   So the fault is gone rather than reworded. The room is the
   site's own deep blue, the trace beats from the first frame,
   and the button opens a door instead of repairing something.

   ── It is an overlay, never a replacement ──
   The whole page is server-rendered UNDERNEATH this. Nothing
   is withheld from crawlers, the LCP element is not deferred
   behind an interaction, and `@media (scripting: none)`
   removes the gate entirely for anyone without JS. If this
   component fails to hydrate the visitor simply gets the
   site, which is the correct failure direction for something
   that renders on top of everything.

   ── Home page only ──
   Someone following a link to a case study is there for the
   case study. Gating a deep link would be user-hostile and
   would tank the entry experience for exactly the audience
   most likely to be sent one.

   ── A clearance that visibly decays ──
   Passing the gate buys one minute, counted down in the
   corner. Reloading inside that window must not re-gate;
   reloading after it must. `gate.ts` holds that decision and
   is unit-tested, because the alternative is verifying it by
   sitting and waiting.

   The expiry NEVER interrupts a reader. `cachedDecision`
   below is resolved once per page load, so a clearance that
   runs out while someone is halfway down the page does
   nothing at all until they next load it.
   ══════════════════════════════════════════════════════ */

/** Printed on reconnect. Not on load: it belongs to the action. */
function announce(): void {
    /* Literal hex, not the CSS tokens: devtools styles the console with its
       own stylesheet and `var(--accent-text)` resolves to nothing there. These
       are --accent-text and --text-secondary, copied. */
    const brand = "color:#4D95C5;font-weight:600";
    const body = "color:#98B8CD";
    /* eslint-disable no-console */
    console.log(
        "%c◆ SIGNAL REACQUIRED%c\n" +
            "Telemetry nominal. You are reading the source, which means\n" +
            "you are the audience this was built for.\n\n" +
            "%cThe console is not the only thing here that rewards poking.\n" +
            "Press ⌘K. Something in that list is not documentation.",
        brand,
        body,
        "color:#7892A3;font-style:italic",
    );
    /* eslint-enable no-console */
}

/* ── Reading a browser-only value without lying to the server ──

   The decision needs localStorage, which does not exist during SSR. Reading
   it in an effect and calling setState causes a cascading render; reading it
   during render causes a hydration mismatch, because the server would have
   rendered nothing while the client renders a gate.

   `useSyncExternalStore` is the sanctioned answer to exactly this: a server
   snapshot of `false` keeps the gate out of the HTML, and the client
   snapshot decides on the first client render.

   The result is cached at module scope rather than recomputed, for two
   reasons. IT MUST NOT FLIP BACK TO `true` while the page is open — that is
   the whole "never mid-browsing" rule, and with a 30-second clearance it is
   no longer a theoretical case the way an hour was — and a client-side
   navigation away and back must not re-gate a visitor who already
   reconnected this session. */
let cachedDecision: boolean | null = null;

function subscribe(): () => void {
    // Never changes after load; nothing to subscribe to.
    return () => {};
}

function getClientSnapshot(): boolean {
    if (cachedDecision === null) {
        let stored: string | null = null;
        try {
            stored = window.localStorage.getItem(GATE_KEY);
        } catch {
            /* Private mode, disabled storage, quota. A null `stored` shows
               the gate, which is the harmless direction to fail in. */
        }
        cachedDecision = shouldShowGate(Date.now(), stored);
    }
    return cachedDecision;
}

/* TRUE, not false, and the inline script in app/layout.tsx is the other half
   of this.

   Returning false here kept the gate out of the server HTML, so the browser
   painted the entire site and only then hydrated the gate on top of it. The
   first impression was a flash of the whole page followed by the entrance,
   which reads as a bug rather than as a threshold.

   So the gate now ships in the HTML and the pre-paint script hides it for
   anyone still inside their clearance. React hydrates against this snapshot and
   then re-renders with the client one, which is exactly what
   useSyncExternalStore exists to make safe — an already-hidden element
   unmounting is invisible. */
function getServerSnapshot(): boolean {
    return true;
}

export default function SignalGate() {
    const wanted = useSyncExternalStore(
        subscribe,
        getClientSnapshot,
        getServerSnapshot,
    );

    /* THREE phases, and they are the three beats of one gesture: `idle` is the
       station waiting, `parting` is the copy leaving while the blocks gather,
       `burst` is the shatter and the handover.

       It was four, and the middle two played a boot readout — seven log lines
       and a green verdict banner. Those were a LOADING SCREEN, and the screen
       they interrupted was not loading anything. The choreography is the
       transition now and there are no words in it at all. */
    const [phase, setPhase] = useState<"idle" | "parting" | "burst">("idle");
    const [dismissed, setDismissed] = useState(false);

    const gateRef = useRef<HTMLDivElement>(null);
    const ecgRef = useRef<HTMLCanvasElement>(null);
    const cubesRef = useRef<HTMLCanvasElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const reducedRef = useRef(false);
    const timers = useRef<number[]>([]);
    /** Where the pointer is, in the physics' units. Null when it has not moved. */
    const pointerRef = useRef<{ x: number; y: number } | null>(null);

    /* ── The finale's clock, and why it is a ref ──────
       `performance.now()` at the instant of the press, or 0 while idle. The
       whole choreography reads its progress from this rather than from React
       state: the field's draw loop runs on gsap.ticker at 60fps, and a state
       update per frame would be sixty renders a second of a component that
       owns three canvases. The phase state exists only for the beats CSS has
       to know about. */
    const finaleRef = useRef(0);

    /** The blocks' poses at the moment the gather begins, frozen. See `convergeAt`. */
    const fromRef = useRef<Pose[]>([]);

    /* ── The field, and why it is a ref ────────────────
       SPAWNED ONCE PER VISIT, and that has to survive things other than a
       resize. It used to be an effect-local `let` guarded by `first = w < 1`,
       which defends against the ResizeObserver and is structurally blind to
       the effect itself re-running — the guard tests a variable that is reset
       by the very event it is meant to catch.

       It was re-running, on every phase change, and the result was the six
       blocks snapping to a fresh evenly-spaced ring at the exact moment of the
       press: all their drift, velocity and rotation thrown away one frame
       before `fromRef` captured them. The dependency list is correct now, but
       a ref is what makes "spawned once" a property of the code rather than
       something contingent on that list staying right. */
    const fieldRef = useRef<Cube[]>([]);

    /** The 27 fragments, cut once when the burst begins. */
    const shardsRef = useRef<Fragment[]>([]);

    /* ── When the field came into being ────────────────
       `performance.now()` at the first frame the blocks exist, which is what
       `arrival.ts` measures its `ARRIVE_DELAY` beat and its flight from.

       MOUNT, NOT PAGE LOAD, and that is the whole point of the change. This
       canvas waits on hydration and on a dynamic chunk, so a fixed delay
       "after the page loads" may already have gone by the time it can draw
       anything — and then the blocks are back to appearing in one cut, which
       is the thing being fixed. Anchored here, the beat is always the same
       length and the arrival can never be skipped. */
    const bornRef = useRef(0);

    /* ── THE TRACE IS ALIVE BEFORE YOU TOUCH ANYTHING ──
       This started at 0, which `ecgAt` draws as a FLATLINE, and that single
       decision was doing more damage than any wording on the screen: a flat
       line on a monitor means no pulse, so the one moving figure on the
       entrance was saying "dead" while the copy insisted otherwise.

       It now rests at a real rhythm just over half amplitude and the existing
       ramp to 1 makes the press a SURGE rather than a resurrection. `ecg.ts`
       needed no change at all — it already had this lever, and its test that
       amplitude rises monotonically with `live` is exactly the guarantee this
       leans on. */
    const REST_LIVE = 0.55;
    const liveRef = useRef(REST_LIVE);

    const open = wanted && !dismissed;

    /* Derived so the hold below runs once per state CHANGE rather than once
       per phase. `idle` and `parting` are both "held"; `burst` is the release. */
    const holdScroll = open && phase !== "burst";

    /* ── THE DOCUMENT, HELD, AND IT TAKES ALL THREE ──
       Scrolling behind the entrance has three separate paths and stopping any
       two of them leaves the page moving.

       1. `overflow: hidden` on the root (`gate-locked` in globals.css) closes
          the NATIVE paths — the scrollbar thumb, the arrow keys, space, Page
          Up/Down, Home and End. The overlay's own `wheel`/`touchmove` handlers
          only ever covered two of those.

       2. `lockScroll()` stops LENIS, and this is the one that was missing.
          Lenis scrolls the window programmatically from the gsap ticker, and
          no overflow rule prevents a programmatic scroll — measured directly:
          with `gate-locked` applied and the scrollbar gone, setting
          `scrollTop` still moved the page. The lock was being taken and then
          silently discarded by `registerLenis`; see the note there.

       3. Neither of those undoes a scroll that has ALREADY happened — from
          the browser restoring a position on reload, or from the window
          between first paint and this effect running. So the position is
          forced to the top on the way in and pinned there.

       KEYED ON A DERIVED BOOLEAN, not on `phase` directly, so the idle →
       parting change does not tear the whole hold down and rebuild it. That
       would drop the lock count to zero for a frame and let Lenis start.

       Released at `burst`: the instant `--gate-bg` goes transparent and the
       site becomes visible. Nothing was on screen before that, so the reflow
       from restoring the scrollbar has nothing to shift against, and scrolling
       arrives exactly when there is something to scroll. Reduced motion goes
       straight from `idle` to `burst` and takes the same path. */
    useEffect(() => {
        if (!holdScroll) return;

        const html = document.documentElement;
        html.classList.add("gate-locked");
        lockScroll();

        /* `force` so it executes while Lenis is stopped, the same reason
           `scrollToSection` passes it. Lenis keeps its own idea of the scroll
           position, so a bare `window.scrollTo` would be undone the moment it
           started again. */
        const toTop = () => {
            const lenis = getLenis();
            if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
            else window.scrollTo(0, 0);
        };
        toTop();

        const pin = () => {
            if (window.scrollY !== 0) toTop();
        };
        window.addEventListener("scroll", pin, { passive: true });

        return () => {
            window.removeEventListener("scroll", pin);
            html.classList.remove("gate-locked");
            unlockScroll();
        };
    }, [holdScroll]);

    useEffect(() => {
        reducedRef.current = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
    }, []);

    /* ── The cursor follows the phase ──────────────────
       Read from the live `--gate-key` rather than hardcoded, so the cursor
       tracks whatever the phase rules resolve to and this file never holds a
       second copy of any palette value.

       It matters less now that the gate is on the site's own colours than it
       did on the red screen — but the `ready` beat is still green, and a
       site-blue cursor over it would be the one thing on screen not agreeing.

       ONE frame later. The token is transitioned, and reading it in the same
       tick as the phase change returns the value it is transitioning FROM —
       the cursor would trail a phase behind all the way through.

       TWO EFFECTS, not one, and the split is the point. A single effect
       keyed on `[open, phase]` would revert in its cleanup on every phase
       change — so each transition would flash the cursor back to site blue
       for a frame before the new colour landed. This one only ever sets. */
    useEffect(() => {
        if (!open) return;

        const id = requestAnimationFrame(() => {
            const node = gateRef.current;
            if (!node) return;
            const key = getComputedStyle(node).getPropertyValue("--gate-key");
            const p = key.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (p?.length !== 3 || !p.every(Number.isFinite)) return;
            window.dispatchEvent(
                new CustomEvent(CURSOR_TINT_EVENT, { detail: { rgb: p } }),
            );
        });

        return () => cancelAnimationFrame(id);
    }, [open, phase]);

    /* And this one only ever reverts, exactly once, when the gate is done.
       THE REVERT IS THE CASE THAT MATTERS: a gate torn down mid-sequence must
       not strand a green cursor over the portfolio, so it lives in a cleanup
       rather than in `close()` — which a crash or an unmount could skip. */
    useEffect(() => {
        if (!open) return;
        return () => {
            window.dispatchEvent(
                new CustomEvent(CURSOR_TINT_EVENT, { detail: { rgb: null } }),
            );
        };
    }, [open]);

    /* ── Who reveals the page ──────────────────────────
       Claim it if this gate is going to render, so app/template.tsx stands
       down and nothing behind the overlay starts moving. Release it here and
       now if it is not — a visitor inside a live clearance never sees the
       gate, and their reload should come in on the very next frame rather
       than waiting out a failsafe.

       Runs before the template's own effect: React fires effects bottom-up
       and this lives inside {children}. `wanted` is resolved once per page
       load by getClientSnapshot, so it cannot change underneath this. */
    useEffect(() => {
        if (wanted) {
            claimEntrance();
        } else {
            releaseEntrance();
        }
    }, [wanted]);

    /* ── The instrument ────────────────────────────────
       ONE trace, and it is the only moving figure on the screen besides the
       field behind it.

       ── IT IS ALIVE BEFORE YOU TOUCH ANYTHING ──
       See `REST_LIVE` above: the trace runs a real rhythm from the first
       frame and the press makes it surge. It used to open on a flatline,
       which is the single most literal way a screen can say "dead", and no
       amount of calm wording was ever going to argue with it.

       It sits in a fixed slot under the title in every phase, so it does not
       move when the copy below it is swapped for the boot log, and it beats
       all the way through the sequence.

       On gsap.ticker rather than its own rAF, which is the rule everywhere
       else in this repo: one frame clock, so nothing races Lenis.

       Colour comes from the live `--gate-key` token, re-read every frame. That
       is what carries the trace from accent to green on the `ready` beat
       without this file knowing either value. */
    useEffect(() => {
        if (!open) return;
        const canvas = ecgRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0;
        let h = 0;

        const size = () => {
            const r = canvas.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            w = r.width;
            h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        size();

        const draw = (seconds: number) => {
            if (w < 1) size();
            if (w < 1) return;

            const key = getComputedStyle(canvas).color;
            const live = liveRef.current;
            /* 0 at rest, 1 once connected. Everything that makes the press
               read as a surge rides this rather than the raw `live`, so the
               resting state stays calm and the connected one is unmistakable. */
            const surge = Math.max(
                0,
                (live - REST_LIVE) / Math.max(1e-6, 1 - REST_LIVE),
            );
            const mid = h * 0.5;
            const amp = h * 0.38;

            ctx.clearRect(0, 0, w, h);

            // Baseline: the instrument, always on, under whatever it reads.
            ctx.beginPath();
            ctx.moveTo(0, mid);
            ctx.lineTo(w, mid);
            ctx.globalAlpha = 0.28 + surge * 0.12;
            ctx.strokeStyle = key;
            ctx.lineWidth = 1.25;
            ctx.stroke();

            ctx.globalAlpha = 0.82 + surge * 0.18;
            ctx.beginPath();
            for (let i = 0; i < ECG_SAMPLES; i++) {
                const u = i / (ECG_SAMPLES - 1);
                const x = u * w;
                const y = mid - ecgAt(u, seconds, live) * amp;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = key;
            ctx.lineWidth = 1.9 + surge * 0.7;
            ctx.lineJoin = "round";
            ctx.stroke();

            /* The sweep head. A monitor's write position — it is what makes
               the strip read as paper coming out of a machine rather than as
               a shape that pulses in place. */
            if (!reducedRef.current) {
                const u = sweepAt(seconds);
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(
                    u * w,
                    mid - ecgAt(u, seconds, live) * amp,
                    2.4 + surge * 1.2,
                    0,
                    Math.PI * 2,
                );
                ctx.fillStyle = key;
                ctx.fill();
            }

            ctx.globalAlpha = 1;
        };

        if (reducedRef.current) {
            /* One still frame per phase. THE PHASE DEPENDENCY BELOW EXISTS FOR
               THIS BRANCH: with no ticker running, a reader who asked for less
               motion would otherwise be left looking at the frame drawn on
               mount, unchanged, long after they had connected — the trace would
               be reporting the wrong state rather than merely a still one. */
            draw(0);
            return;
        }

        const tick = (time: number) => draw(time);
        gsap.ticker.add(tick);
        const ro = new ResizeObserver(size);
        ro.observe(canvas);

        return () => {
            gsap.ticker.remove(tick);
            ro.disconnect();
        };
    }, [open, phase]);

    /* ── The field ────────────────────────────────────
       Translucent blocks drifting through the entrance, pushing each other
       apart and scattering from the pointer.

       ── THE STATE LIVES HERE, THE DECISIONS DO NOT ──
       `cubes.ts` says what a block looks like and `forces.ts` says how one
       moves; both are pure and both are simulated in node. This is the
       `engine.ts` of the pair — a mutable array, a canvas and a clock, which
       is the part that has no testable surface. Every constant that could ruin
       the field lives on the other side of that line.

       ── IT NOW OUTLIVES THE PRESS, BECAUSE IT IS THE PRESS ──
       This used to stand down the instant the button was hit — the blocks were
       a backdrop and the transition was a boot log, so there was nothing for
       them to do. Now they ARE the transition: they gather into one cube and
       that cube shatters into the hero, so this loop runs the whole way and
       the effect is keyed on `open` alone.

       Three regimes in one loop, chosen by the finale clock rather than by
       React state, because a state update per frame would be sixty renders a
       second of a component holding three canvases:

         idle      the physics field, as before
         parting   the physics stops; the blocks ease to one pose
         burst     27 fragments, flying and fading

       At the end there is nothing left to draw and nothing left to pay for. */
    useEffect(() => {
        if (!open) return;
        const canvas = cubesRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0;
        let h = 0;
        const field = fieldRef.current;

        const size = () => {
            const r = canvas.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            w = r.width;
            h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            /* Spawned once, from the first real box. A resize must NOT respawn
               — the blocks would jump to new places mid-read — so the physics
               simply carries on against the new bounds, which is what the soft
               walls are for.

               The guard is the FIELD'S OWN emptiness, not `w`. Keying it off a
               local meant anything that re-entered this effect got a brand-new
               ring of blocks while believing it was protecting against exactly
               that. */
            if (field.length === 0) {
                field.push(...spawnField(w < 768 ? 4 : 6, Math.random, w, h));
            }
        };
        size();

        /* ── The pointer, in the physics' own units ──
           Tracked on the window rather than the canvas because the canvas sits
           under a scrim and the copy column, and a reader moving the cursor
           over the headline should still push the blocks behind it. */
        const onMove = (e: PointerEvent) => {
            if (w < 1) return;
            const m = Math.min(w, h);
            pointerRef.current = {
                x: (e.clientX - w / 2) / m,
                y: (e.clientY - h / 2) / m,
            };
        };
        const onLeave = () => {
            pointerRef.current = null;
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerleave", onLeave);

        let last = 0;

        /* One solid, drawn. Shared by all three regimes so a block, the merged
           cube and a fragment are all made of the same material — which is the
           point of shattering into cubes rather than into particles.

           Faces carry the volume, edges carry the light, and the balance
           between them is the difference between a solid and a wireframe. The
           fills are the accent and the edges are ice, so a near solid reads as
           glass lit from inside rather than as an outline.

           A convex solid puts exactly TWO faces over any given pixel, not six,
           so the ceiling one can add is 1-(1-0.3)² ≈ 0.51 — which is what the
           contrast maths is checked against, with headroom for three. */
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

        /** Project a pose into sorted faces, the way `renderCube` does. */
        const facesOf = (pose: Pose) => {
            const pts = CUBE_VERTS.map((v) => project(v, pose, w, h));
            return CUBE_FACES
                .map((idx) => {
                    const quad = idx.map((i) => pts[i]);
                    return { pts: quad, depth: faceDepth(quad) };
                })
                .sort((a, b) => b.depth - a.depth);
        };

        const draw = (seconds: number) => {
            if (w < 1) size();
            if (w < 1) return;

            /* One source for the colour, and it is the canvas's own computed
               `color` — the rule the trace already follows. The face fill is
               DERIVED from it here rather than written down, so there is no
               second copy of the palette in this file. */
            const key = getComputedStyle(canvas).color;
            const rgb = key.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (rgb?.length !== 3) return;
            const [r, g, b] = rgb;
            const edge = `${r},${g},${b}`;

            const dt = last === 0 ? 1 / 60 : seconds - last;
            last = seconds;

            /* One clock read a frame, shared by the arrival and the finale.
               They measure from different instants but both off the same
               monotonic source. */
            const now = performance.now();
            if (bornRef.current === 0) bornRef.current = now;

            ctx.clearRect(0, 0, w, h);
            ctx.lineJoin = "round";
            ctx.lineWidth = 1;

            const ms = finaleRef.current === 0 ? -1 : now - finaleRef.current;

            /* ── The arrival: the blocks flying in ──
               Before anything else, and only ever once. `arrival.ts` owns the
               choreography; this writes the result straight into each block's
               `x`/`y` rather than drawing from a separate pose.

               MUTATING IS THE POINT. Everything downstream — the pointer
               scatter, the freeze at `CONVERGE_AT`, the merge — reads a live
               position with no special case for "is it still arriving", so a
               reader who presses ENTER mid-flight gets a gather that starts
               from where the blocks actually are. The button is focused on
               open and Enter is one keystroke away; somebody will.

               The physics does not run here. There is nothing for it to fight
               yet, and the blocks are outside the soft walls it would spend
               the whole arrival pushing them back through.

               `reducedRef` skips the whole thing: that path draws ONE still
               frame with no ticker, so without this guard it would render the
               blocks off screen and leave the room permanently empty — the
               worst possible outcome for the reader least served by it. */
            const since = bornRef.current === 0 ? Infinity : now - bornRef.current;
            if (
                finaleRef.current === 0 &&
                !reducedRef.current &&
                since < ARRIVE_TOTAL
            ) {
                const env = envFor(w, h);
                const drifting = field.map((c, i) => {
                    const d = arriveAt(c, i, field.length, since, env);
                    c.x = d.x;
                    c.y = d.y;
                    return { cube: c, alpha: d.alpha };
                });

                const solids = drifting
                    .map(({ cube, alpha }) => ({
                        ...renderCube(cube, seconds, w, h),
                        alpha,
                    }))
                    .sort((a, z) => a.near - z.near);
                for (const s of solids) paint(s.faces, s.near, edge, s.alpha);
                return;
            }

            /* ── The physics field: idle, AND the beat before the gather ──
               ONE BRANCH FOR BOTH, and the boundary is `CONVERGE_AT` rather
               than the press.

               The gather does not start for 180ms after the click — that
               overlap is deliberate, so the blocks begin moving while the last
               words are still leaving. Stopping the physics at the press
               instead left the field dead still for those 180ms: a hitch right
               at the moment of contact. It went unnoticed only because a worse
               bug was sitting on top of it, snapping every block to a fresh
               position on the same frame.

               So the field keeps drifting until the choreography actually has
               something to say, and the handover is exact: `convergeAt(from, 0)`
               returns `from` unchanged, so the first frame of the gather draws
               precisely what the physics frame would have. */
            if (ms < CONVERGE_AT) {
                const env = envFor(w, h);
                for (const c of field) c.r = collisionRadius(c, depthAt(c, seconds));
                stepField(field, dt, seconds, { ...env, pointer: pointerRef.current });

                /* Sorted far to near ACROSS the field, not just within each
                   block. Six faces sorted inside a solid that is itself drawn
                   in array order still stacks a distant block over a near one,
                   and with translucent fills that reads as the depth being
                   wrong rather than as a bug. */
                const solids = field
                    .map((c) => renderCube(c, seconds, w, h))
                    .sort((a, z) => a.near - z.near);
                for (const s of solids) paint(s.faces, s.near, edge, 1);
                return;
            }

            /* ── Freezing the start poses ──
               Captured HERE, on the first frame at or after `CONVERGE_AT`,
               rather than in the click handler — the handler has no access to
               the field, and more importantly the branch above ran the physics
               right up to this instant, so this IS where the blocks are.

               That claim used to be false. The effect was keyed on `phase` as
               well as `open`, so the press tore it down and re-ran it, and the
               drifted field was discarded microseconds before this line read
               it. The comment was correct about the intent and the code did
               the opposite; see `fieldRef` above. */
            if (fromRef.current.length === 0) {
                fromRef.current = field.map((c) =>
                    poseOf(c, depthAt(c, seconds), seconds),
                );
            }

            /* ── Burst: HANDED OVER, not drawn ──
               This canvas stops at the burst. `components/GlyphA/` picks the
               same 27 fragments up from `lib/handoff.ts` and flies them on
               into the letter, so the debris outlives the overlay that
               produced it.

               It has to be one canvas or the other. Both drawing the same
               fragments for the same 900ms would composite them twice, and
               translucent faces painted over themselves come out at roughly
               double strength — not obviously a bug, just a burst that is
               inexplicably brighter than the cube it came from.

               Nothing else about the schedule moves. `FINALE_MS` still ends
               the overlay 900ms from here; the gate simply paints nothing for
               that last stretch, which is invisible because the background is
               already transparent and the copy has already left. */
            if (ms >= BURST_AT) return;

            /* ── Parting: six blocks becoming one ──
               THE PHYSICS IS OFF FROM THE GATHER, not from the press. Leaving
               it running here would have the field pushing blocks apart while
               the choreography pulls them together, and the merged cube would
               arrive soft-edged — the one thing `convergeAt`'s test exists to
               guarantee against. Before the gather there is nothing to fight,
               so it runs. */
            const u = Math.min(1, Math.max(0, (ms - CONVERGE_AT) / CONVERGE_MS));
            const merged = fromRef.current.map((p) => convergeAt(p, u));
            /* Far to near, and it matters most at the end: at u = 1 all six
               are the same solid, so what stacks is six identical shells and
               the fill accumulates into something lit from within. */
            const order = merged
                .map((pose) => ({ pose, near: nearness(pose.z) }))
                .sort((a, z) => a.near - z.near);
            for (const o of order) paint(facesOf(o.pose), o.near, edge, 1);
        };

        if (reducedRef.current) {
            /* One still frame, and no physics at all. The room is colour and
               composition before it is motion, and there is no reason to take
               the composition away from someone who asked for less movement. */
            draw(0);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerleave", onLeave);
            return;
        }

        const tick = (time: number) => draw(time);
        gsap.ticker.add(tick);
        const ro = new ResizeObserver(size);
        ro.observe(canvas);

        return () => {
            gsap.ticker.remove(tick);
            ro.disconnect();
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerleave", onLeave);
        };
        /* ── `open` ALONE, AND THAT IS LOAD-BEARING ──
           Nothing in this effect reads `phase`; the regime comes from
           `finaleRef`. It was in the list anyway — copied from the ECG effect
           above, where the dependency IS deliberate and IS documented, because
           that draw reads `liveRef` and a reduced-motion reader needs a fresh
           still frame per phase.

           Here it did nothing but damage. Every phase change tore the loop
           down and rebuilt it, which respawned the field, cleared the canvas
           and re-registered the ticker, the observer and both listeners. The
           visible symptom was the six blocks jumping to a fresh ring on the
           press. The reduced-motion path had it worse: it never sets
           `finaleRef`, so the re-run redrew the IDLE field from a new spawn —
           a hard cut to a different arrangement, for the readers least served
           by one. */
    }, [open]);

    /* Hold the atlas dormant while the gate is up, so reconnecting is what
       brings it to life. Reuses the quiet broadcast the case-study zone and
       the Stack field already use, keyed by source so the three cannot
       clobber one another. */
    useEffect(() => {
        if (!open) return;
        const node = gateRef.current;

        window.dispatchEvent(
            new CustomEvent(ATLAS_QUIET_EVENT, {
                detail: { source: "boot", quiet: true },
            }),
        );

        /* These two are the wheel and nothing else, and that is all they were
           ever worth. The document is held by the `holdScroll` effect above —
           overflow, Lenis and the pinned position together.

           They stay because a wheel that reaches Lenis is a wheel Lenis will
           try to act on, and stopping it at the overlay costs nothing. */
        const block = (e: Event) => e.preventDefault();
        node?.addEventListener("wheel", block, { passive: false });
        node?.addEventListener("touchmove", block, { passive: false });

        buttonRef.current?.focus();

        return () => {
            node?.removeEventListener("wheel", block);
            node?.removeEventListener("touchmove", block);
            window.dispatchEvent(
                new CustomEvent(ATLAS_QUIET_EVENT, {
                    detail: { source: "boot", quiet: false },
                }),
            );
        };
    }, [open]);

    /** Everything that must happen exactly once, whichever path gets there. */
    const commit = useCallback(() => {
        /* Written at the CLICK, not at the end, so a reload part way through
           the boot does not gate the visitor again. */
        try {
            /* The TTL goes in alongside the timestamp even though it is a
               constant now. That is what lets a clearance written by an
               earlier deploy be recognised and clamped rather than
               misinterpreted — see gate.ts. */
            window.localStorage.setItem(
                GATE_KEY,
                encodeClearance(Date.now(), TTL_MS),
            );
        } catch {
            /* Storage unavailable. The gate will show again next load, which
               is a small annoyance rather than a broken page. */
        }
        announce();
    }, []);

    /* Tearing down is its own step, and the in-memory flag MUST NOT be
       cleared before it.

       `cachedDecision` is what `getClientSnapshot` returns, and
       `useSyncExternalStore` re-reads that on the very next render. Clearing
       it inside `commit` therefore unmounted the gate the instant
       `setPhase("linking")` re-rendered: measured, the whole two-second
       sequence collapsed to 165ms and nobody ever saw a line. It belongs
       here, where unmounting is the intent.

       It still has to happen at all, or navigating to a case study and back
       would remount this and gate an already-connected visitor twice. */
    const close = useCallback(() => {
        cachedDecision = false;
        setDismissed(true);
        /* Idempotent, and by now almost always a no-op: the entrance is
           released at the BURST, not here, so the hero is already arriving
           behind the debris by the time this runs. This is the backstop for
           the reduced-motion path, which has no burst to release from. */
        releaseEntrance();
    }, []);

    const reconnect = useCallback(() => {
        if (phase !== "idle") return;
        commit();

        if (reducedRef.current) {
            /* No gather and no shatter. A reader who asked for less motion
               gets the copy fading and the overlay going, which is the honest
               version of this — not a slower explosion. */
            setPhase("burst");
            liveRef.current = 1;
            timers.current.push(window.setTimeout(close, EXIT_MS + 120));
            return;
        }

        /* The finale's clock starts HERE and the draw loop reads it directly.
           Everything below is scheduled as an absolute offset from the click
           rather than chained, so a dropped frame cannot push the sequence
           long — the same reasoning the boot log used. */
        finaleRef.current = performance.now();
        shardsRef.current = shatter(Math.random);
        setPhase("parting");

        /* ── The fragments, handed on ──
           `components/GlyphA/` catches these and flies them into the letter,
           so the debris outlives the overlay that made it. THE GATE'S OWN
           pieces, not a re-`shatter()`: the letter is built out of what the
           reader watched leave, and a second cut would give 27 different ones
           with the same statistics and none of the continuity.

           PUBLISHED HERE, AT THE CLICK, rather than in the burst callback
           below — and dated forward to when the burst will actually happen,
           in the same clock `finaleRef` uses.

           It belongs at the click because `releaseEntrance()` runs its
           subscribers SYNCHRONOUSLY and the glyph's subscriber is what calls
           `takeBurst()`. Publishing beside that release makes two adjacent
           lines order-dependent: get them the wrong way round and the letter
           asks for the fragments one line before they exist, gets null, and
           falls back to a fresh `shatter()`. Nothing errors — the debris just
           quietly stops being the debris that left, which is the one thing
           this handover is for. A full second of daylight removes the hazard
           instead of documenting it. */
        publishBurst(shardsRef.current, finaleRef.current + BURST_AT);

        timers.current.push(
            window.setTimeout(() => {
                setPhase("burst");
                /* ── THE HANDOVER ──
                   `releaseEntrance()` at the burst, not at unmount, and this
                   is the single line that makes the whole sequence one shot
                   instead of two scenes. Hero's SplitText timeline runs for
                   about a second, so it is still arriving while fragments are
                   still crossing it: you watch the site appear THROUGH the
                   debris rather than after it.

                   Released at unmount instead, there is a dead beat between
                   the explosion ending and the page starting — which is
                   exactly the seam this is meant to hide. */
                releaseEntrance();
            }, BURST_AT),
        );
        timers.current.push(window.setTimeout(close, FINALE_MS));

        /* The entrance's backstop. app/template.tsx deliberately refuses to
           release while this overlay is on screen, because a reader may take
           any amount of time to press the button — so the only bounded window
           is the one that starts at the click. Idempotent, so on the normal
           path the release above has already happened and this costs nothing. */
        timers.current.push(
            window.setTimeout(releaseEntrance, FINALE_MS + 400),
        );

        /* Ramp the trace from its resting rhythm up to full, so the press
           reads as the signal locking on rather than as something switching.
           It is leaving at the same time, which is the point: the last thing
           it does before it goes is beat harder. */
        const start = performance.now();
        const ramp = () => {
            const p = Math.min(1, (performance.now() - start) / 320);
            liveRef.current = REST_LIVE + (1 - REST_LIVE) * p;
            if (p < 1) requestAnimationFrame(ramp);
        };
        requestAnimationFrame(ramp);
    }, [phase, commit, close]);

    // Clear anything pending if the component goes away mid-sequence.
    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

    /* THE BUTTON IS THE ONLY WAY THROUGH.

       There was a global keydown handler here that reconnected on any key,
       and a click-anywhere skip during the boot. Both are gone: the gate is
       passed by pressing the control, and the two seconds then always play
       in full rather than being cut short by a stray key or a misplaced
       click.

       No accessibility cost, and this is worth being clear about. The button
       is still reachable by Tab and still activates on Enter and Space,
       because that is what a native <button> does. What went away is "any
       key dismisses", which is a different thing and was the part that made
       the entrance feel accidental. */

    if (!open) return null;

    return (
        <div
            ref={gateRef}
            className="signal-gate"
            data-phase={phase}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signal-gate-title"
        >
            {/* ── The room ──────────────────────────────
                The aura and the scrim are the ::before and ::after of this
                element; the canvas paints between them. Ordering is the whole
                job: colour, then blocks, then a scrim over the content column,
                then the copy on top of all three. The light pools AROUND the
                reader rather than behind them, which is what keeps every ratio
                on this screen where it should be. */}
            <div className="signal-gate-backdrop" aria-hidden="true">
                <canvas ref={cubesRef} className="signal-gate-cubes" />
            </div>

            {/* Target-lock brackets, the same motif the cursor draws. */}
            <span className="signal-gate-frame" aria-hidden="true" />

            <div className="signal-gate-inner">
                {/* ── The masthead ───────────────────────
                    A NAME IS THE STRONGEST ANTI-ERROR SIGNAL THERE IS. No
                    browser error page, no outage notice and no 500 has a
                    person's name across the top of it, so this settles the
                    "is the site broken?" question in the first half-second —
                    which the previous version, opening on a warning triangle
                    and the words SYSTEM ALERT, actively worked against.

                    The status sits opposite it rather than under the name, so
                    the row reads as a header bar and gives the column a
                    defined top edge. Two things, one line, no stack. */}
                <p className="signal-gate-meta">
                    <span className="signal-gate-who">
                        Aditya Harikrishnan
                        <span aria-hidden="true"> · </span>
                        <span className="signal-gate-who-sub">Portfolio</span>
                    </span>

                    {/* COLOUR IS NEVER THE ONLY SIGNAL. The state is carried
                        three independent ways — this glyph, the wording beside
                        it, and the palette. Any one alone is enough.

                        A PULSING DOT, not a power symbol. A power symbol says
                        "switched off", which was right when the premise was a
                        fault and is exactly wrong now: the station is up, and
                        a dot with a pulse ring is what every piece of live
                        hardware in the world uses to say so. */}
                    <span className="signal-gate-status-chip">
                        <span className="signal-gate-glyph" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="4" fill="currentColor" />
                                <circle
                                    className="signal-gate-ping"
                                    cx="12"
                                    cy="12"
                                    r="8.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        </span>
                        Live
                    </span>
                </p>

                {/* ── THE WORDS DO NOT CHANGE, THEY LEAVE ──
                    Every string on this screen is now a constant. There used
                    to be three headlines and three status words tracking the
                    phases, because the phases had a boot readout to narrate;
                    with the choreography carrying the transition there is
                    nothing left to narrate, and copy that rewrites itself on
                    the way out is noise at exactly the moment the screen
                    should be getting quieter.

                    All of it stays MOUNTED through `parting` so CSS can carry
                    it out on a stagger — unmounting would be the abrupt cut
                    this is deliberately not. */}
                <p id="signal-gate-title" className="signal-gate-title">
                    Ready when you are.
                </p>

                {/* The one instrument. It leaves with the copy, fading rather
                    than cutting — its ticker is detached only once the fade is
                    over, or the last frame would freeze and the reader would
                    watch a still line fade next to one that was moving. */}
                <canvas
                    ref={ecgRef}
                    className="signal-gate-ecg"
                    aria-hidden="true"
                />

                {/* ── What the reader is about to see ──────
                    Orienting, not explaining. The break is EXPLICIT, one span
                    per line, so the two clauses do not wrap wherever the
                    column happens to run out. */}
                <p className="signal-gate-body">
                    <span>ML systems, full-stack engineering.</span>
                    <span>Three projects, measured.</span>
                </p>

                <button
                    ref={buttonRef}
                    type="button"
                    onClick={reconnect}
                    className="signal-gate-action"
                >
                    Enter
                    {/* An arrow, not a power symbol. Nothing here is switched
                        off; this is a threshold, and an arrow is the one mark
                        that means "through here" to everybody. It follows the
                        word for the same reason a door handle sits on the
                        leading edge. */}
                    <span className="signal-gate-power" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.3">
                            <path d="M4.5 12h14" stroke="currentColor" strokeLinecap="round" />
                            <path d="m12.8 6.2 5.8 5.8-5.8 5.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                </button>
            </div>
        </div>
    );
}
