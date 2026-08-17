"use client";

import { useCallback, useSyncExternalStore } from "react";
import { GATE_KEY, expiredClearance, msRemaining, parseClearance } from "./gate";

/* ══════════════════════════════════════════════════════
   UplinkTimer — the clearance, counting down

   Passing the gate buys one minute. This is the only place
   that says so. Without it the rule is invisible: the gate
   simply reappears one day and reads as a bug rather than as
   a link that went stale.

   ── It reads the clearance, and it can END one ──
   It used to only read. It can now also expire the clearance
   on demand, because the entrance is the piece of this site
   people most want to see twice and the only way to get back
   to it was to wait a minute out. Hovering the chip explains
   what pressing it does; pressing it backdates the stored
   clearance so the next load runs the entrance again.

   ── It still never re-gates anyone mid-session ──
   The important invariant survives that, and it survives it
   for the original reason: the decision to show the gate is
   resolved ONCE per page load inside SignalGate. So ending a
   clearance — by pressing this, or by letting it run out —
   changes exactly one thing on screen, this readout, and
   nothing else until the reader chooses to reload.

   ── The control exists only while the clearance does ──
   Once it has expired, by either route, there is nothing left
   to end and the chip stops being a button until the next
   load. That is not a special case: "expired" simply has no
   action attached to it.

   ── Why it is not inside SignalGate ──
   SignalGate unmounts the moment the boot finishes. This has
   to outlive it, and it re-renders once a second, which is a
   reason of its own to keep it away from a component that
   owns a canvas on the ticker.
   ══════════════════════════════════════════════════════ */

/* ── The store ─────────────────────────────────────────
   `useSyncExternalStore`, not `useState` in an effect, for the same reason
   SignalGate uses it: the value lives in localStorage, which does not exist
   during SSR, and reading it during render or setting it from an effect are
   both the wrong shape.

   The snapshot is a STRING and it is cached at module scope. Both matter.
   React calls `getSnapshot` more than once per render and compares the
   results by identity, so it cannot be allowed to read the clock itself — a
   fresh `Date.now()` on each call tears at every second boundary and React
   warns about it. The interval does the reading; `getSnapshot` returns
   whatever it last wrote. */
type Snapshot = "none" | "expired" | `live:${number}`;

let snapshot: Snapshot = "none";

const listeners = new Set<() => void>();
let timer = 0;

function read(): Snapshot {
    let raw: string | null = null;
    try {
        raw = window.localStorage.getItem(GATE_KEY);
    } catch {
        /* Private mode, disabled storage. Nothing to report, so report
           nothing — this is an ornament, not a control. */
        return "none";
    }

    // Never cleared, or a value that isn't one of ours: no clearance to show.
    if (parseClearance(raw) === null) return "none";

    const left = msRemaining(Date.now(), raw);
    return left <= 0 ? "expired" : `live:${Math.ceil(left / 1000)}`;
}

/* 250ms, not 1000. The display only changes once a second — the snapshot is
   whole seconds and identical values never notify — but polling at exactly
   the display rate makes the visible number up to a full second stale, so the
   countdown drifts against the clock it claims to be reading. Four cheap
   reads a second cost nothing and keep it honest. */
const POLL_MS = 250;

function tick(): void {
    const next = read();
    if (next === snapshot) return;
    snapshot = next;
    listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
    listeners.add(onChange);

    if (timer === 0) {
        /* Read once immediately. Waiting for the first interval would show
           nothing for a quarter second after the gate closes, which reads as
           the element popping in late. */
        tick();
        timer = window.setInterval(tick, POLL_MS);
    }

    return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
            window.clearInterval(timer);
            timer = 0;
        }
    };
}

const getSnapshot = (): Snapshot => snapshot;

/** Nothing on the server: there is no storage to have read. */
const getServerSnapshot = (): Snapshot => "none";

/** `m:ss`, so a minute reads as 1:00 → 0:47 rather than as a bare number. */
function clock(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function UplinkTimer() {
    const state = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot,
    );

    /* Backdate the stored clearance and let the poll above notice, rather than
       setting local state. One source of truth, and the chip then flips to
       "expired" through exactly the same path a natural expiry takes — so
       there is no second code path that could disagree with the first. */
    const revoke = useCallback(() => {
        try {
            window.localStorage.setItem(GATE_KEY, expiredClearance());
        } catch {
            /* Storage unavailable. Nothing to end, and nothing to report — the
               chip cannot have been rendered from a value we could not read. */
        }
        tick();
    }, []);

    if (state === "none") return null;

    const expired = state === "expired";
    const seconds = expired ? 0 : Number(state.slice("live:".length));

    /* The full sentence, which no longer fits on screen. It reaches a screen
       reader through the sr-only span below, and a mouse through the hover
       panel while the clearance is live or `title` once it is not. */
    const full = expired
        ? "Uplink clearance expired — reload to reconnect"
        : `Uplink clearance — ${clock(seconds)} remaining`;

    /* ── Why this is a chip and not a pill ──
       It is `position: fixed` at left: 1.5rem, and the content column starts
       at x = 128 (`.section-container` has padding-left: 8rem to clear the nav
       rail). That leaves a 104px gutter. The readout used to spell itself out
       — "Uplink expired · refresh to reconnect" measured ~290px — so it lay
       across the left third of every heading that scrolled past it. Measured,
       even the live form at 119px was already 15px into the text.

       So the wording goes and the data stays: `● 0:36` is ~70px and
       `● expired` is ~94px, both inside the gutter at every width. */
    const inner = (
        <>
            <span className="uplink-timer-dot" aria-hidden="true" />
            <span className="uplink-timer-value" aria-hidden="true">
                {expired ? "expired" : clock(seconds)}
            </span>
        </>
    );

    return (
        /* The live region and the control are separate elements on purpose. A
           <button> that is also an aria-live region is muddled: assistive tech
           has to decide whether it is announcing a status or describing an
           action. So the wrapper is the status and the chip inside it is the
           control. */
        <div
            className="uplink-timer"
            data-state={expired ? "expired" : "live"}
            /* Polite, not assertive, and the announced string is the sr-only
               sentence rather than the digits. A countdown that re-announces
               every second is unusable with a screen reader on, which is why
               the visible value is aria-hidden. */
            aria-live="polite"
        >
            <span className="sr-only">{full}</span>

            {expired ? (
                /* Nothing left to end. `title` carries the sentence for a
                   mouse, as it did before the panel existed — there is no
                   panel in this state because there is no action to explain. */
                <span className="uplink-timer-chip" title={full}>
                    {inner}
                </span>
            ) : (
                <button
                    type="button"
                    className="uplink-timer-chip"
                    onClick={revoke}
                    /* An explicit label rather than name-from-content, and that
                       is what makes the panel below safe to nest here: as a
                       descendant it would otherwise be concatenated into the
                       button's accessible name. Labelled explicitly, it is
                       free to be the description instead. */
                    aria-label="End uplink clearance now"
                    aria-describedby="uplink-timer-hint"
                >
                    {inner}

                    {/* ── The explanation, on hover and on focus ──
                        Anchored BELOW the chip and left-aligned to it, which
                        is the one position that cannot cover the thing it
                        describes or leave the viewport at any width.

                        `pointer-events: none` in CSS, and that is not a
                        detail: nested inside the button, a panel that took the
                        pointer would make its own area a click target — so
                        moving the mouse down to read it would expire the
                        clearance the reader was still deciding about. */}
                    <span
                        className="uplink-timer-hint"
                        id="uplink-timer-hint"
                        role="tooltip"
                    >
                        <span className="uplink-timer-hint-head">
                            End clearance
                        </span>
                        <span className="uplink-timer-hint-body">
                            Expires the uplink now. Reload to see the entrance
                            again.
                        </span>
                    </span>
                </button>
            )}
        </div>
    );
}
