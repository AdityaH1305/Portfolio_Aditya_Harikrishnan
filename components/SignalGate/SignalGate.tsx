"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { gsap } from "@/lib/motion";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { claimEntrance, releaseEntrance } from "@/lib/entrance";
import { ATLAS_QUIET_EVENT, CURSOR_TINT_EVENT } from "@/lib/zone";
import {
    GATE_KEY,
    TTL_MS,
    encodeClearance,
    shouldShowGate,
    bootSequence,
    BOOT_TOTAL_MS,
    BOOT_FADE_MS,
    BOOT_FADE_AT,
    BOOT_CONFIRM_AT,
    BOOT_CONFIRM_MS,
} from "./gate";
import { ecgAt, sweepAt, ECG_SAMPLES } from "./ecg";
import {
    collisionRadius,
    depthAt,
    envFor,
    renderCube,
    spawnField,
    type Cube,
} from "./cubes";
import { stepField } from "./forces";

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

    /* FOUR phases, not one flag: `idle` is the station waiting, `linking`
       plays the readout, `ready` is the verdict, `leaving` cross-fades into
       the site.

       They were `lost → booting → confirmed`, and the rename is the whole
       redesign in miniature. Nothing here is broken and nothing is being
       recovered — the system is up from the first frame and the button
       connects you to it. */
    const [phase, setPhase] = useState<
        "idle" | "linking" | "ready" | "leaving"
    >("idle");
    const [dismissed, setDismissed] = useState(false);
    const [shown, setShown] = useState(0);

    const gateRef = useRef<HTMLDivElement>(null);
    const ecgRef = useRef<HTMLCanvasElement>(null);
    const cubesRef = useRef<HTMLCanvasElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const reducedRef = useRef(false);
    const timers = useRef<number[]>([]);
    /** Where the pointer is, in the physics' units. Null when it has not moved. */
    const pointerRef = useRef<{ x: number; y: number } | null>(null);

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
    const lines = bootSequence();

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

       ── IT BELONGS TO `idle` ALONE ──
       Keyed on the phase, not just on `open`, and the ticker callback is
       therefore REMOVED the instant the button is pressed rather than left
       running behind an opacity of 0. A full-viewport canvas integrating a
       physics field and redrawing six solids every frame is not something to
       keep paying for through a sequence that also has the trace and a boot
       log in it. The element stays mounted so CSS can fade it, and the last
       frame painted is what fades — hence no `clearRect` on the way out. */
    useEffect(() => {
        if (!open || phase !== "idle") return;
        const canvas = cubesRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let w = 0;
        let h = 0;
        let field: Cube[] = [];

        const size = () => {
            const r = canvas.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return;
            const first = w < 1;
            w = r.width;
            h = r.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            /* Spawned once, from the first real box. A resize must NOT respawn
               — the blocks would jump to new places mid-read — so the physics
               simply carries on against the new bounds, which is what the soft
               walls are for. */
            if (first) field = spawnField(w < 768 ? 4 : 6, Math.random, w, h);
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

            // Step the physics. `dt` is clamped inside `stepField`.
            const dt = last === 0 ? 1 / 60 : seconds - last;
            last = seconds;
            const env = envFor(w, h);
            for (const c of field) c.r = collisionRadius(c, depthAt(c, seconds));
            stepField(field, dt, seconds, { ...env, pointer: pointerRef.current });

            ctx.clearRect(0, 0, w, h);
            ctx.lineJoin = "round";
            ctx.lineWidth = 1;

            /* Sorted far to near ACROSS the field, not just within each block.
               Six faces sorted inside a solid that is itself drawn in array
               order still stacks a distant block over a near one, and with
               translucent fills that reads as the depth being wrong rather
               than as a bug. */
            const solids = field
                .map((c) => renderCube(c, seconds, w, h))
                .sort((a, z) => a.near - z.near);

            for (const solid of solids) {
                for (const f of solid.faces) {
                    ctx.beginPath();
                    ctx.moveTo(f.pts[0].x, f.pts[0].y);
                    for (let i = 1; i < f.pts.length; i++) {
                        ctx.lineTo(f.pts[i].x, f.pts[i].y);
                    }
                    ctx.closePath();

                    /* Faces carry the volume, edges carry the light, and the
                       balance between them is the difference between a solid
                       and a wireframe. The fills are the accent and the edges
                       are ice, so a near block reads as glass lit from inside
                       rather than as an outline.

                       A convex solid puts exactly TWO faces over any given
                       pixel, not six, so the ceiling a block can add is
                       1-(1-0.3)² ≈ 0.51 — which is what the contrast maths is
                       checked against, with headroom for three stacked. */
                    ctx.fillStyle = `rgba(${edge},${0.12 + solid.near * 0.26})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(${ICE},${0.16 + solid.near * 0.3})`;
                    ctx.stroke();
                }
            }
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
    }, [open, phase]);

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

        /* `lockScroll()` alone does NOT hold this one, and the reason is an
           ordering race rather than a bug in the lock.

           It works by calling `lenis.stop()`, but ScrollProvider registers the
           Lenis instance from inside the gsap ticker, which first runs on the
           next animation frame. Mount effects run before that frame, so this
           call always finds a null instance and does nothing, and
           `registerLenis` then resets the lock count to zero, discarding it
           outright. Measured: the gate was up with `overflow: visible` and no
           `lenis-stopped` class, so the page scrolled freely behind it and a
           visitor would have landed somewhere mid-page on reconnect.

           Blocking the events on the overlay itself is immune to that
           ordering, and unlike putting `overflow: hidden` on the root it does
           not remove the scrollbar, so nothing shifts sideways at the exact
           moment of the reveal. The lock below is still called: it is
           reference-counted and correct once Lenis is up. */
        const block = (e: Event) => e.preventDefault();
        node?.addEventListener("wheel", block, { passive: false });
        node?.addEventListener("touchmove", block, { passive: false });

        lockScroll();
        buttonRef.current?.focus();

        return () => {
            node?.removeEventListener("wheel", block);
            node?.removeEventListener("touchmove", block);
            unlockScroll();
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
        /* HERE, not in commit(). This is the moment the page becomes visible,
           and the whole point of holding the entrance is that the reveals
           start when the reader can actually see them. Released from commit()
           they would run under the last 1.6s of the boot log. */
        releaseEntrance();
    }, []);

    const reconnect = useCallback(() => {
        if (phase !== "idle") return;
        setPhase("linking");
        commit();

        if (reducedRef.current) {
            /* No animation, but the verdict is information rather than
               decoration — it still gets its time on screen. Skipping it here
               would take the confirmation away from exactly the readers most
               likely to need an interface to be explicit. */
            setShown(lines.length);
            setPhase("ready");
            liveRef.current = 1;
            timers.current.push(window.setTimeout(close, BOOT_CONFIRM_MS));
            return;
        }

        /* One timer per line, plus the fade and the unmount, all scheduled
           from the click rather than chained. Chaining would let a dropped
           frame push the sequence past its two seconds; absolute offsets
           cannot drift. */
        lines.forEach((line, i) => {
            timers.current.push(
                window.setTimeout(() => setShown(i + 1), line.at),
            );
        });
        timers.current.push(
            window.setTimeout(() => setPhase("ready"), BOOT_CONFIRM_AT),
        );
        timers.current.push(
            window.setTimeout(() => setPhase("leaving"), BOOT_FADE_AT),
        );
        timers.current.push(window.setTimeout(close, BOOT_TOTAL_MS));

        /* The entrance's backstop, armed HERE rather than on mount.
           app/template.tsx deliberately refuses to release while this overlay
           is on screen, because a reader may take any amount of time to press
           the button — so the only bounded window is the one that starts at
           the click. If `close` somehow never runs, this still hands the page
           over a moment after the sequence should have ended. Idempotent, so
           the normal path costs nothing. */
        timers.current.push(
            window.setTimeout(releaseEntrance, BOOT_TOTAL_MS + 400),
        );

        /* Ramp the trace from its resting rhythm up to full, so the press
           reads as the signal locking on rather than as something switching.
           Its own rAF because it has to finish inside the first 320ms whatever
           the line timers are doing. */
        const start = performance.now();
        const ramp = () => {
            const p = Math.min(1, (performance.now() - start) / 320);
            liveRef.current = REST_LIVE + (1 - REST_LIVE) * p;
            if (p < 1) requestAnimationFrame(ramp);
        };
        requestAnimationFrame(ramp);
    }, [phase, commit, lines]);

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

                    {/* COLOUR IS NEVER THE ONLY SIGNAL. Accent→green is a
                        gentler pairing than the red→green this used to be, but
                        the rule stands: the state is carried three independent
                        ways — this glyph, the wording beside it, and the
                        palette. Any one alone is enough.

                        A PULSING DOT, not a power symbol. A power symbol says
                        "switched off", which was right when the premise was a
                        fault and is exactly wrong now: the station is up, and
                        a dot with a pulse ring is what every piece of live
                        hardware in the world uses to say so. */}
                    <span className="signal-gate-status-chip">
                        <span className="signal-gate-glyph" aria-hidden="true">
                            {phase === "ready" || phase === "leaving" ? (
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9.25" stroke="currentColor" />
                                    <path d="m7.6 12.3 3 3 5.8-6.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
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
                            )}
                        </span>
                        {phase === "idle"
                            ? "Live"
                            : phase === "linking"
                              ? "Linking"
                              : "Connected"}
                    </span>
                </p>

                {/* THREE HEADLINES, NOT TWO, and the middle one is the point:
                    a single "Connected." covering both `linking` and `ready`
                    claims the arrival while the readout is still running, and
                    a headline that gets ahead of the log under it is the sort
                    of small dishonesty that makes a sequence feel canned.

                    None of the three repeats the status chip beside it or the
                    banner at the end — "Linking", "You're in." and "Uplink
                    established" are three statements, not one said thrice. */}
                <p id="signal-gate-title" className="signal-gate-title">
                    {phase === "idle"
                        ? "Ready when you are."
                        : phase === "linking"
                          ? "Coming online."
                          : "You’re in."}
                </p>

                {/* ── The one instrument, in a fixed slot ──
                    Above the phase-dependent block rather than inside it, so
                    it holds the same position in all four phases and does not
                    move when the copy below is swapped for the boot log.

                    That is also what lets it survive the press and finally
                    beat — see the effect. */}
                <canvas
                    ref={ecgRef}
                    className="signal-gate-ecg"
                    aria-hidden="true"
                />

                {phase === "idle" ? (
                    <>
                        {/* ── What the reader is about to see ──────
                            Orienting, not explaining. The old copy was in the
                            business of talking someone down — "nothing is
                            broken" — which only ever made sense on a screen
                            that had just alarmed them. With nothing to
                            reassure, the line does the useful thing instead
                            and tells a recruiter what is behind the door.

                            The break is EXPLICIT, one span per line, so the
                            two clauses do not wrap wherever the column happens
                            to run out. */}
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
                            {/* An arrow, not a power symbol. Nothing here is
                                switched off; this is a threshold, and an arrow
                                is the one mark that means "through here" to
                                everybody. It follows the word for the same
                                reason a door handle is on the leading edge. */}
                            <span className="signal-gate-power" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.3">
                                    <path d="M4.5 12h14" stroke="currentColor" strokeLinecap="round" />
                                    <path d="m12.8 6.2 5.8 5.8-5.8 5.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </button>
                    </>
                ) : (
                    <ol className="signal-gate-log" aria-live="polite">
                        {lines.slice(0, shown).map((l) => (
                            <li key={l.label} className="signal-gate-row">
                                <span
                                    className="signal-gate-arrow"
                                    aria-hidden="true"
                                >
                                    &gt;
                                </span>
                                <span className="signal-gate-label">
                                    {l.label}
                                </span>
                                {l.status ? (
                                    <span className="signal-gate-status">
                                        [{l.status}]
                                    </span>
                                ) : null}
                            </li>
                        ))}
                        {shown < lines.length ? (
                            <li className="signal-gate-row" aria-hidden="true">
                                <span className="signal-gate-caret" />
                            </li>
                        ) : null}
                    </ol>
                )}
            </div>

            {/* ── The verdict ───────────────────────────
                Across the bottom, full width, and impossible to miss: the beat
                that says the sequence worked rather than leaving a reader to
                infer it from a fade.

                "Uplink established", not "All systems operational" — the
                latter was reassurance about a fault, and there is no longer a
                fault to reassure anyone about. This states an arrival.

                Its own `aria-live` rather than relying on the log's. That
                region announces rows as they stream, and this is a different
                kind of message — it must be spoken as one, not as an eighth
                log line.

                Rendered from `linking` onward and revealed by CSS on `ready`,
                so the strip's height is in the layout from the start and the
                log above it does not shift when it arrives. */}
            {phase !== "idle" && (
                <div className="signal-gate-verdict" aria-live="polite">
                    <span className="signal-gate-verdict-glyph" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="9.25" stroke="currentColor" />
                            <path
                                d="m7.6 12.3 3 3 5.8-6.4"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                    {phase === "linking" ? "" : "Uplink established"}
                </div>
            )}
        </div>
    );
}
