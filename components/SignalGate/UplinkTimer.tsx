"use client";

import { useSyncExternalStore } from "react";
import { GATE_KEY, msRemaining, parseClearance } from "./gate";

/* ══════════════════════════════════════════════════════
   UplinkTimer — the clearance, counting down

   Passing the gate buys 30–60 seconds. This is the only
   place that says so. Without it the rule is invisible: the
   gate simply reappears one day and reads as a bug rather
   than as a link that went stale.

   ── It never re-gates anyone ──
   This component only READS. The decision to show the gate
   is resolved once per page load inside SignalGate, so a
   clearance running out while someone is halfway down the
   page changes exactly one thing on screen — this readout —
   and nothing else until they choose to reload. That is the
   requirement, and it holds because the countdown and the
   gate are deliberately not wired to each other.

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

/** `m:ss`, so 30–60 seconds reads as 0:47 rather than as a bare number. */
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

    if (state === "none") return null;

    const expired = state === "expired";
    const seconds = expired ? 0 : Number(state.slice("live:".length));

    /* The full sentence, which no longer fits on screen. It reaches a mouse
       through `title` and a screen reader through the sr-only span below. */
    const full = expired
        ? "Uplink clearance expired — refresh to reconnect"
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
    return (
        <div
            className="uplink-timer"
            data-state={expired ? "expired" : "live"}
            title={full}
            /* Polite, not assertive, and the announced string is the sr-only
               sentence rather than the digits. A countdown that re-announces
               every second is unusable with a screen reader on, which is why
               the visible value is aria-hidden. */
            aria-live="polite"
        >
            <span className="uplink-timer-dot" aria-hidden="true" />
            <span className="sr-only">{full}</span>
            <span className="uplink-timer-value" aria-hidden="true">
                {expired ? "expired" : clock(seconds)}
            </span>
        </div>
    );
}
