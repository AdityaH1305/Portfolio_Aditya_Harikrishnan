"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { ATLAS_QUIET_EVENT } from "@/lib/zone";
import { GATE_KEY, GATE_TTL_MS, shouldShowGate } from "./gate";

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

   ── One hour ──
   Reloading must not re-gate; coming back tomorrow should.
   `gate.ts` holds that decision and is unit-tested, because
   the alternative is verifying it by waiting an hour.
   ══════════════════════════════════════════════════════ */

/** Printed on reconnect. Not on load: it belongs to the action. */
function announce(): void {
    const brand = "color:#E8A33D;font-weight:600";
    const body = "color:#A8A29B";
    /* eslint-disable no-console */
    console.log(
        "%c◆ SIGNAL REACQUIRED%c\n" +
            "Telemetry nominal. You are reading the source, which means\n" +
            "you are the audience this was built for.\n\n" +
            "%cThe console is not the only thing here that rewards poking.\n" +
            "Press ⌘K. Something in that list is not documentation.",
        brand,
        body,
        "color:#8A837A;font-style:italic",
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
   reasons. It must not flip back to `true` if the page happens to be open
   when the hour rolls over, and a client-side navigation away and back must
   not re-gate a visitor who already reconnected this session. */
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
   anyone still inside their hour. React hydrates against this snapshot and
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
    const [dismissed, setDismissed] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const gateRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const reducedRef = useRef(false);

    const open = wanted && !dismissed;

    useEffect(() => {
        reducedRef.current = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
    }, []);

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
           call always finds a null instance and does nothing — and
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

    const reconnect = useCallback(() => {
        if (leaving) return;
        setLeaving(true);
        announce();

        try {
            window.localStorage.setItem(GATE_KEY, String(Date.now()));
        } catch {
            /* Storage unavailable. The gate will show again next load, which
               is a small annoyance rather than a broken page. */
        }
        /* Also clear the in-memory decision, or navigating to a case study
           and back would remount this and gate an already-connected visitor
           a second time. */
        cachedDecision = false;

        // Matches the CSS fade. Instant when motion is reduced.
        const hold = reducedRef.current ? 0 : 620;
        window.setTimeout(() => setDismissed(true), hold);
    }, [leaving]);

    /* Any key, not just the button. Someone who has read "reestablish" and
       reached for the keyboard should not have to find the tab stop first. */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            e.preventDefault();
            reconnect();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, reconnect]);

    if (!open) return null;

    return (
        <div
            ref={gateRef}
            className="signal-gate"
            data-leaving={leaving ? "" : undefined}
            role="dialog"
            aria-modal="true"
            aria-labelledby="signal-gate-title"
        >
            <div className="signal-gate-inner">
                <p className="label-muted signal-gate-meta">
                    Uplink <span aria-hidden="true">·</span> no carrier
                </p>

                <p id="signal-gate-title" className="signal-gate-title">
                    Signal lost
                </p>

                <p className="body-sm signal-gate-body">
                    Telemetry from this station stopped mid-transmission.
                    Everything is still down there.
                </p>

                <button
                    ref={buttonRef}
                    type="button"
                    onClick={reconnect}
                    className="signal-gate-action"
                >
                    Reestablish connection
                </button>

                <p className="label-muted signal-gate-hint">
                    or press any key
                </p>
            </div>
        </div>
    );
}

export { GATE_KEY, GATE_TTL_MS };
