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
import { ATLAS_QUIET_EVENT } from "@/lib/zone";
import {
    GATE_KEY,
    encodeClearance,
    randomTtl,
    shouldShowGate,
    bootSequence,
    BOOT_TOTAL_MS,
    BOOT_FADE_MS,
    BOOT_FADE_AT,
} from "./gate";
import { waveAt, WAVE_SAMPLES } from "./wave";

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

    /* Three phases, not one flag. `lost` is the idle instrument, `booting`
       plays the readout, `leaving` cross-fades into the site. */
    const [phase, setPhase] = useState<"lost" | "booting" | "leaving">("lost");
    const [dismissed, setDismissed] = useState(false);
    const [shown, setShown] = useState(0);

    const gateRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
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

    /* ── The carrier ───────────────────────────────────
       On gsap.ticker rather than its own rAF, which is the rule everywhere
       else in this repo: one frame clock, so nothing races Lenis. The canvas
       unmounts with the gate, so none of this survives the entrance. */
    useEffect(() => {
        if (!open) return;
        const canvas = canvasRef.current;
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

        /* Read the accent from CSS rather than hardcoding it, the same rule
           the atlas and the orbit field follow. */
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent-rgb")
            .trim();
        const parsed = raw.split(/[\s,/]+/).map(Number);
        const [ar, ag, ab] =
            parsed.length >= 3 && parsed.every(Number.isFinite)
                ? parsed
                : [232, 163, 61];

        const draw = (seconds: number) => {
            if (w < 1) size();
            if (w < 1) return;

            const live = liveRef.current;
            const mid = h / 2;
            const amp = h * 0.42;

            ctx.clearRect(0, 0, w, h);

            /* The baseline stays visible underneath at all times: it is the
               instrument, and the trace is what the instrument is reading. */
            ctx.beginPath();
            ctx.moveTo(0, mid);
            ctx.lineTo(w, mid);
            ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.1 + live * 0.12})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            for (let i = 0; i < WAVE_SAMPLES; i++) {
                const x = (i / (WAVE_SAMPLES - 1)) * w;
                const y = mid - waveAt(i, WAVE_SAMPLES, seconds, live) * amp;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.34 + live * 0.62})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };

        if (reducedRef.current) {
            // One frame, no loop. The trace becomes a still reading.
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
            /* The TTL is rolled HERE and stored with the timestamp. Rolling it
               at read time instead would give a different answer on every
               render, and the countdown would jitter between 30 and 60. */
            window.localStorage.setItem(
                GATE_KEY,
                encodeClearance(Date.now(), randomTtl(Math.random())),
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
            setShown(lines.length);
            close();
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
            {/* Target-lock brackets, the same motif the cursor draws. */}
            <span className="signal-gate-frame" aria-hidden="true" />

            <div className="signal-gate-inner">
                <p className="label-muted signal-gate-meta">
                    {phase === "lost"
                        ? "Uplink / no carrier"
                        : "Uplink / carrier locked"}
                </p>

                <p id="signal-gate-title" className="signal-gate-title">
                    {phase === "lost" ? "Signal lost" : "Reacquired"}
                </p>

                {/* The instrument. Present in both phases so it never jumps;
                    only what it reads changes. */}
                <canvas
                    ref={canvasRef}
                    className="signal-gate-wave"
                    aria-hidden="true"
                />

                {phase === "lost" ? (
                    <>
                        <p className="body-sm signal-gate-body">
                            Telemetry from this station stopped mid
                            transmission. Everything is still down there.
                        </p>

                        <button
                            ref={buttonRef}
                            type="button"
                            onClick={reconnect}
                            className="signal-gate-action"
                        >
                            <span
                                className="signal-gate-caret"
                                aria-hidden="true"
                            />
                            Reestablish connection
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
        </div>
    );
}
