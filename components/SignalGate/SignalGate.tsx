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
import { renderCube, spawnField } from "./cubes";

/* ══════════════════════════════════════════════════════
   Signal Gate

   The site opens having lost contact. One control brings it
   back, and the reconnection is what starts everything: the
   console line prints, the atlas wakes out of its dormant
   core, and the page is handed over.

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
   Passing the gate buys 30–60 seconds, rolled per visit and
   counted down in the corner. Reloading inside that window
   must not re-gate; reloading after it must. `gate.ts` holds
   that decision and is unit-tested, because the alternative
   is verifying it by sitting and waiting.

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
   first impression was a flash of the page followed by "Signal lost", which
   reads as a bug rather than as a transmission dropping.

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

    /* FOUR phases, not one flag. `lost` is the alert, `booting` plays the
       readout, `confirmed` is the verdict, `leaving` cross-fades into the
       site.

       `confirmed` was added because readers reported thinking the site was
       down. A sequence that ends by quietly fading leaves them to infer that
       it worked; this one says so, in green, in words, with a check. */
    const [phase, setPhase] = useState<
        "lost" | "booting" | "confirmed" | "leaving"
    >("lost");
    const [dismissed, setDismissed] = useState(false);
    const [shown, setShown] = useState(0);

    const gateRef = useRef<HTMLDivElement>(null);
    const ecgRef = useRef<HTMLCanvasElement>(null);
    const cubesRef = useRef<HTMLCanvasElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const reducedRef = useRef(false);
    const timers = useRef<number[]>([]);
    /** 0 while lost, ramped to 1 on reconnect. Read by the draw loop. */
    const liveRef = useRef(0);

    const open = wanted && !dismissed;
    const lines = bootSequence();

    useEffect(() => {
        reducedRef.current = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
    }, []);

    /* ── The cursor joins the alert ────────────────────
       Without this it is the one element still site-blue on a red screen,
       which undercuts the whole point of the palette.

       Read from the live `--gate-key` rather than hardcoded, so the cursor
       tracks whatever the phase rules resolve to and this file never holds a
       second copy of the red, the blue or the green.

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
       not strand a red cursor over the portfolio, so it lives in a cleanup
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
       ONE trace, and it is the only moving figure on the screen.

       There were two. A radio carrier sat under the title and this heart
       monitor sat against the button — two wave canvases, a few hundred pixels
       apart, saying nearly the same thing. The carrier is gone, along with
       `wave.ts`, which nothing else imported.

       ── AND IT SURVIVES THE PRESS, WHICH IT DID NOT ──
       This canvas used to live inside the `lost` branch, so it unmounted the
       instant the button was clicked. `liveRef` ramps 0 → 1 on that click and
       `ecgAt` takes it — so the entire payoff, a flatline that starts beating
       the moment the fault is fixed, had never once been on screen. Only the
       carrier lived long enough to come alive, and it was the wrong figure to
       do it. That is why the trace read as decoration: its one job was
       unreachable.

       It now sits in a fixed slot under the title in every phase, so it does
       not move when the copy below it is swapped for the boot log, and it
       beats all the way through the sequence.

       On gsap.ticker rather than its own rAF, which is the rule everywhere
       else in this repo: one frame clock, so nothing races Lenis.

       Colour comes from the live `--gate-key` token, re-read every frame. That
       is what carries the trace from red through blue to green as the phases
       change, without this file knowing any of those values. */
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

        /* ── NOTHING BUT THE TRACE ON THIS CANVAS ─────
           Four attempts put a pointer here and every one of them failed, for
           the same underlying reason: the strip and the button were the same
           width, so wherever an arrowhead landed it was competing with the
           trace it was drawn on.

           The pointer is gone entirely now, and so is the duplicate label it
           was aiming at — the button says what it does, is the only control on
           the screen, and is the only filled thing on it. What is left here is
           the instrument: a flatline while contact is lost, a heartbeat once
           it is back. */

        const draw = (seconds: number) => {
            if (w < 1) size();
            if (w < 1) return;

            const key = getComputedStyle(canvas).color;
            const live = liveRef.current;
            const mid = h * 0.5;
            /* Was 0.22 of a 64px box — a 14px spike on a 331px strip, which
               rendered as a hairline rule with a nick in it rather than as a
               heart monitor. The trace has to be legible as a beat from
               across the room or it is just another horizontal line on a
               screen that already has too many. */
            const amp = h * 0.38;

            ctx.clearRect(0, 0, w, h);

            // Baseline: the instrument, always on, under whatever it reads.
            ctx.beginPath();
            ctx.moveTo(0, mid);
            ctx.lineTo(w, mid);
            /* Was 0.22 at 1px, which on the red room simply vanished — a
               flatline that cannot be seen is not reading as a flatline, it is
               reading as nothing being there. */
            ctx.globalAlpha = 0.34;
            ctx.strokeStyle = key;
            ctx.lineWidth = 1.25;
            ctx.stroke();

            ctx.globalAlpha = 1;
            ctx.beginPath();
            for (let i = 0; i < ECG_SAMPLES; i++) {
                const u = i / (ECG_SAMPLES - 1);
                const x = u * w;
                const y = mid - ecgAt(u, seconds, live) * amp;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = key;
            ctx.lineWidth = 2.1;
            ctx.lineJoin = "round";
            ctx.stroke();

            /* The sweep head. A monitor's write position — it is what makes
               the strip read as paper coming out of a machine rather than as
               a shape that pulses in place. */
            if (!reducedRef.current) {
                const u = sweepAt(seconds);
                ctx.beginPath();
                ctx.arc(u * w, mid - ecgAt(u, seconds, live) * amp, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = key;
                ctx.fill();
            }

            ctx.globalAlpha = 1;
        };

        if (reducedRef.current) {
            /* One still frame per phase. THE PHASE DEPENDENCY BELOW EXISTS FOR
               THIS BRANCH: with no ticker running, a reader who asked for less
               motion would otherwise be left looking at the flatline drawn on
               mount, unchanged, long after they had fixed it — the trace would
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

    /* ── The red room ─────────────────────────────────
       Translucent blocks tumbling behind the alert, after the PlayStation 2's
       red screen of death. `cubes.ts` holds the field and the projection and
       is unit-tested; this only paints what it returns.

       ── IT BELONGS TO `lost` ALONE ──
       Keyed on the phase, not just on `open`, and the ticker callback is
       therefore REMOVED the instant the button is pressed rather than left
       running behind an opacity of 0. A full-viewport canvas redrawing thirty
       solids every frame is not something to keep paying for through a
       reconnect sequence that also has two other canvases and a boot log in
       it. The element stays mounted so CSS can fade it, and the last frame
       painted is what fades — hence no `clearRect` on the way out. */
    useEffect(() => {
        if (!open || phase !== "lost") return;
        const canvas = cubesRef.current;
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

        /* SIX. The first version drew thirty and it buried the screen — the
           headline, the trace and the button each had a block behind them and
           the whole thing read as noise rather than as a room.

           Both counts are EVEN, and that is a requirement rather than a
           preference: `spawnField` deals bearings on half-slice offsets, which
           only keeps the ring clear of the copy's own axis when the count
           divides the circle evenly either side of it. `cubes.test.ts`
           asserts it. */
        const field = spawnField(window.innerWidth < 768 ? 4 : 6, Math.random);

        const draw = (seconds: number) => {
            if (w < 1) size();
            if (w < 1) return;

            /* One source for the red, and it is the canvas's own computed
               `color` — the rule the carrier and the ECG already follow. The
               face fill is DERIVED from it here rather than written down,
               so there is no second copy of the palette in this file. */
            const key = getComputedStyle(canvas).color;
            const rgb = key.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (rgb?.length !== 3) return;
            const [r, g, b] = rgb;
            const face = `${Math.round(r * 0.6)},${Math.round(g * 0.35)},${Math.round(b * 0.32)}`;
            const edge = `${r},${g},${b}`;

            ctx.clearRect(0, 0, w, h);
            ctx.lineJoin = "round";
            ctx.lineWidth = 1;

            /* Sorted far to near ACROSS the field, not just within each cube.
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
                       and a wireframe. The first pass had the fills at half
                       this and the edges brighter, and the field read as line
                       art rather than as blocks with something inside them.

                       A convex solid puts exactly TWO faces over any given
                       pixel, not six, so the ceiling a cube can add is
                       1-(1-0.3)² ≈ 0.51 — which is what the contrast maths
                       was checked against, with headroom for three of them
                       stacked. */
                    ctx.fillStyle = `rgba(${face},${0.1 + solid.near * 0.2})`;
                    ctx.fill();
                    ctx.strokeStyle = `rgba(${edge},${0.14 + solid.near * 0.26})`;
                    ctx.stroke();
                }
            }
        };

        if (reducedRef.current) {
            /* One still frame. The room is colour and composition before it is
               motion, and there is no reason to take the composition away from
               someone who asked for less of the movement. */
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
       `setPhase("booting")` re-rendered: measured, the whole two-second
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
        if (phase !== "lost") return;
        setPhase("booting");
        commit();

        if (reducedRef.current) {
            /* No animation, but the verdict is information rather than
               decoration — it still gets its time on screen. Skipping it here
               would take the reassurance away from exactly the readers most
               likely to need an interface to be explicit. */
            setShown(lines.length);
            setPhase("confirmed");
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
            window.setTimeout(() => setPhase("confirmed"), BOOT_CONFIRM_AT),
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

        /* Ramp the trace into life so it grows rather than switching. Its own
           rAF because it has to finish inside the first 320ms whatever the
           line timers are doing. */
        const start = performance.now();
        const ramp = () => {
            const p = Math.min(1, (performance.now() - start) / 320);
            liveRef.current = p;
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
            {/* ── The red room ──────────────────────────
                The aura and the scrim are the ::before and ::after of this
                element; the canvas paints between them. Ordering is the whole
                job: colour, then blocks, then a near-black scrim over the
                content column, then the copy on top of all three. The glow
                pools AROUND the reader rather than behind them, which is what
                keeps every ratio on this screen where it was. */}
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

                    {/* COLOUR IS NEVER THE ONLY SIGNAL. Red→green is the
                        textbook red/green colour-blind failure, so the state is
                        carried three independent ways: this glyph, the wording
                        beside it, and the palette. Any one alone is enough. */}
                    <span className="signal-gate-status-chip">
                        <span className="signal-gate-glyph" aria-hidden="true">
                            {phase === "lost" ? (
                                /* A POWER SYMBOL, not a warning triangle. A
                                   triangle is error iconography and it was the
                                   first mark the eye resolved on this screen.
                                   This one is read by everyone, technical or
                                   not, as "switched off — switch it on": it
                                   says both "intentional" and "there is a
                                   control here" in a single glyph. */
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                                    <path d="M12 3.2v8.4" stroke="currentColor" strokeLinecap="round" />
                                    <path d="M7.4 6.6a6.6 6.6 0 1 0 9.2 0" stroke="currentColor" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9.25" stroke="currentColor" />
                                    <path d="m7.6 12.3 3 3 5.8-6.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </span>
                        {phase === "lost" ? "Standby" : "Online"}
                    </span>
                </p>

                <p id="signal-gate-title" className="signal-gate-title">
                    {phase === "lost" ? "Signal lost" : "Reacquired"}
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

                {phase === "lost" ? (
                    <>
                        {/* Says the two things the reader needs and nothing
                            else: nothing is broken, and the way forward is the
                            control below. The old copy — "telemetry from this
                            station stopped mid transmission" — was diagnostic
                            prose, which is exactly how an outage page reads. */}
                        <p className="signal-gate-body">
                            Nothing is broken. This is the entrance — press
                            below to bring the site up.
                        </p>

                        <button
                            ref={buttonRef}
                            type="button"
                            onClick={reconnect}
                            className="signal-gate-action"
                        >
                            {/* The same power symbol as the status chip, on the
                                thing that acts on it. It replaces a blinking
                                terminal caret, which was decoration; this one
                                is an instruction. */}
                            <span className="signal-gate-power" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.3">
                                    <path d="M12 3.2v8.4" stroke="currentColor" strokeLinecap="round" />
                                    <path d="M7.4 6.6a6.6 6.6 0 1 0 9.2 0" stroke="currentColor" strokeLinecap="round" />
                                </svg>
                            </span>
                            Restore signal
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
                Across the bottom, full width, and impossible to miss. This is
                the half of the redesign that answers the actual complaint:
                the old sequence ended by fading out, so a reader who had just
                been shown a fault had to INFER that it was fixed. Now it is
                stated.

                Its own `aria-live` rather than relying on the log's. That
                region announces rows as they stream, and the verdict is a
                different kind of message — it must be spoken as one, not as a
                ninth log line.

                Rendered from `booting` onward and revealed by CSS on
                `confirmed`, so the strip's height is in the layout from the
                start and the log above it does not shift when it arrives. */}
            {phase !== "lost" && (
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
                    {phase === "booting" ? "" : "All systems operational"}
                </div>
            )}
        </div>
    );
}
