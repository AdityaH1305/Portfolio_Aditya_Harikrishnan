"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { GA_ID } from "@/lib/site";
import { onEntranceReady } from "@/lib/entrance";
import {
    OPT_OUT_KEY,
    classifyClick,
    optOutIntent,
    optOutValue,
    registerSink,
    setSuppressed,
    track,
    vercelBeforeSend,
} from "@/lib/analytics";

/* ══════════════════════════════════════════════════════
   Telemetry — the impure half of lib/analytics.ts

   Two sinks, one delegated listener, one opt-out switch.
   Every DECISION lives in lib/analytics.ts, which is pure
   and unit-tested; this file owns only the wiring, the same
   split gate.ts / SignalGate.tsx already uses.

   ── Named Telemetry, not Analytics ──
   It imports `{ Analytics }` from @vercel/analytics and would
   otherwise collide with itself. "Telemetry" is also the
   site's own word — Contact.tsx's footer says so.

   ── TWO TOOLS, AND THEY ARE NOT REDUNDANT ──
   Vercel is ~1KB, same-origin at /_vercel/insights/*,
   cookieless and effectively never ad-blocked: the ACCURATE
   pageview baseline, which matters because this site's
   audience is exactly the demographic that runs uBlock. GA4
   supplies what Vercel's Hobby plan does not — custom events
   (Pro-only there), UTM campaigns, and a 14-month window
   against Vercel's one month.

   On Hobby the `track()` calls below reach Vercel and are
   silently NOT RECORDED. That is expected, not a bug, and
   the call is not dead code: it starts recording the day the
   plan changes, with no edit here.
   ══════════════════════════════════════════════════════ */

/* ── EVERY ANALYTICS IMPORT IS DEFERRED, AND THAT IS THE POINT ──
   Measured on the production build: the chunk holding `@vercel/analytics` and
   `@next/third-parties` is 16.3 KB gzipped, and as a STATIC import from a
   component mounted in the root layout it was fetched and evaluated as part of
   hydration — inside the ~490 ms of long tasks the first second of this page
   already spends on React and GSAP.

   Nothing here is needed during hydration. Vercel's pageview fires from its own
   mount effect and is just as correct one tick later; GA was already waiting on
   the entrance. `ssr: false` is legal here because this file is a client
   component — the root layout is a server component and could not have written
   these itself.

   NO EVENT IS LOST. `track()` in lib/analytics.ts buffers until a sink
   registers and flushes to it at registration; that buffer exists for exactly
   this window, and the delegated click listener below is attached from an
   effect in THIS component, which does not wait for the chunks. */
const Analytics = dynamic(
    () => import("@vercel/analytics/next").then((m) => m.Analytics),
    { ssr: false },
);
const GoogleAnalytics = dynamic(
    () => import("@next/third-parties/google").then((m) => m.GoogleAnalytics),
    { ssr: false },
);

/** Loaded on demand, so the sink costs nothing until it is registered. */
async function vaTrack(name: string, props: Record<string, unknown>) {
    const { track } = await import("@vercel/analytics");
    track(name, props as never);
}

async function gaSend(name: string, props: Record<string, unknown>) {
    const { sendGAEvent } = await import("@next/third-parties/google");
    sendGAEvent("event", name, props);
}

/**
 * How long GA may wait for the entrance before loading anyway.
 *
 * See the deferral effect. The shape is app/template.tsx's
 * `ENTRANCE_FAILSAFE_MS` and SignalGate's `FINALE_MS + 400`: a bound on
 * something that is otherwise waiting on a human.
 */
const GA_FAILSAFE_MS = 2500;

export default function Telemetry() {
    const [gaReady, setGaReady] = useState(false);

    /* ── 1. The opt-out switch ─────────────────────────
       `/?analytics=off` suppresses everything on this device; `?analytics=on`
       lifts it. Read from `window.location.search` in an effect and NOT via
       `useSearchParams`, which opts the route into a client bailout and would
       cost this 100%-static site its prerendered routes — all seven of them,
       to read one param that almost nobody passes. */
    useEffect(() => {
        const intent = optOutIntent(window.location.search);
        if (!intent) return;

        try {
            if (intent === "off") {
                window.localStorage.setItem(
                    OPT_OUT_KEY,
                    optOutValue(Date.now()),
                );
                setSuppressed(true);
            } else {
                window.localStorage.removeItem(OPT_OUT_KEY);
                setSuppressed(false);
            }
        } catch {
            /* Private mode, disabled storage, quota — the same failure
               SignalGate's clearance read guards. Nothing else to do: the
               switch simply does not persist. */
        }

        /* eslint-disable-next-line no-console */
        console.log(
            `%c◆ ANALYTICS ${intent.toUpperCase()}%c\n` +
                (intent === "off"
                    ? "This browser is no longer counted. Reload to drop the GA script too."
                    : "This browser is counted again."),
            "color:#4D95C5;font-weight:600",
            "color:#98B8CD",
        );

        /* Strip the param. Left in place it persists in the URL bar, gets
           bookmarked and shared — handing the switch to a stranger — and
           leaks into the Referer of every outbound click from this page. */
        window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.hash,
        );
    }, []);

    /* ── 2. The Vercel sink ────────────────────────────
       Registered unconditionally. On Hobby this records nothing and does not
       throw; see the header before deleting it as dead code. */
    useEffect(() => registerSink("vercel", (n, p) => void vaTrack(n, p)), []);

    /* ── 3. The GA sink ────────────────────────────────
       Registered only once the script is on the page. `sendGAEvent` pushes
       into `window.dataLayer`, which QUEUES, so anything fired between
       <GoogleAnalytics> mounting and gtag.js arriving over the network still
       lands. The buffer in lib/analytics.ts covers the earlier window, before
       this runs at all. Two mechanisms, and they do not overlap. */
    useEffect(() => {
        if (!GA_ID || !gaReady) return;
        return registerSink("ga", (n, p) => void gaSend(n, p));
    }, [gaReady]);

    /* ── 4. One delegated click listener for the whole site ──
       Instead of threading `onClick` through SideNav, Hero, Contact, CtaRow
       and CaseStudyStage. Cursor.tsx already does exactly this one event type
       over — `pointerover` → `closest("[data-cursor]")` → `dataset.cursor` —
       so this is the house pattern, not a new one.

       It also buys zero-diff instrumentation for the files that could not
       take it cheaply: MagneticLink forwards neither `onClick` nor `data-*`,
       so instrumenting Contact.tsx per-component would have meant widening a
       component the hero CTAs also use.

       ── `{ capture: true }` IS REQUIRED, and it is the one non-obvious
       line here. CommandPalette calls `e.stopPropagation()` in a React
       handler on its panel. React 19 attaches its root listener at the root
       CONTAINER, so a native stopPropagation from inside a React handler
       prevents the event ever reaching a bubble-phase document listener —
       every click inside the palette would be invisible. Capture runs
       document→target BEFORE React sees anything, so nothing downstream can
       hide a click. Do not "tidy" this to bubble.

       ── `auxclick` because a middle-click fires no `click` at all. A
       recruiter middle-clicking "Technical Report" into a new tab is both
       plausible and exactly the event worth having.

       ── READ-ONLY: never preventDefault, never stopPropagation, whole body
       in try/catch. That makes ordering against Lenis's `anchors: true`
       interception irrelevant, and means a bug in the classifier cannot break
       a link. This sits above every navigation on the site. */
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            try {
                if (e.button > 1) return;
                const el = (e.target as Element | null)?.closest?.(
                    "a[href], [data-analytics]",
                ) as HTMLElement | null;
                if (!el) return;

                const hit = classifyClick({
                    href: el.getAttribute("href") ?? "",
                    origin: window.location.origin,
                    pathname: window.location.pathname,
                    sectionId: el.closest("section[id]")?.id ?? null,
                    tag: el.dataset.analytics ?? null,
                    surface: el.dataset.analyticsSurface ?? null,
                });
                if (hit) track(hit.name, hit.props);
            } catch {
                /* Measurement never breaks navigation. */
            }
        };

        document.addEventListener("click", onClick, { capture: true });
        document.addEventListener("auxclick", onClick, { capture: true });
        return () => {
            document.removeEventListener("click", onClick, { capture: true });
            document.removeEventListener("auxclick", onClick, {
                capture: true,
            });
        };
    }, []);

    /* ── 5. GA waits for the entrance ──────────────────
       gtag.js is ~30KB gzip from a third-party origin — a DNS lookup, a TLS
       handshake and main-thread parse — and at `afterInteractive` it lands
       exactly while Hero's SplitText timeline is running its ~1s entrance.
       This whole codebase is organised around that second; lib/entrance.ts
       exists for nothing else. Vercel's ~1KB same-origin script is NOT
       deferred, because it is the baseline and costs nothing.

       THE FAILSAFE IS NOT DECORATION. Deferring on `onEntranceReady` alone
       means a visitor who abandons the SignalGate without pressing never
       loads gtag at all — so GA's pageviews would silently exclude every
       bounce and bias the whole property toward engaged visitors. That is a
       worse failure than a slow script. `onEntranceReady` fires synchronously
       when the entrance has already released, so /work/* is immediate.

       Nothing is lost either way: `track()` buffers until a sink exists and
       flushes at registration. */
    useEffect(() => {
        if (!GA_ID) return;
        const stop = onEntranceReady(() => setGaReady(true));
        const failsafe = window.setTimeout(
            () => setGaReady(true),
            GA_FAILSAFE_MS,
        );
        return () => {
            stop();
            window.clearTimeout(failsafe);
        };
    }, []);

    return (
        <>
            <Analytics beforeSend={vercelBeforeSend} />
            {GA_ID && gaReady ? <GoogleAnalytics gaId={GA_ID} /> : null}
        </>
    );
}
