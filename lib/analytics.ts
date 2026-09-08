/* ══════════════════════════════════════════════════════
   Analytics — the decisions half

   Everything here is a decision that is SILENT when it is
   wrong. A mis-classified click does not throw, does not log
   and does not look different on screen; it becomes a number
   in a dashboard that quietly stops meaning what its name
   says, and you find out a month later when you try to act
   on it. That is the argument components/SignalGate/gate.ts
   makes for its own existence, and this file is the same
   shape: pure, zero imports, unit-tested, with the
   listener-and-sink half in components/Telemetry.tsx.

   ── ZERO IMPORTS, AND THAT IS LOAD-BEARING ──
   lib/analytics.test.ts runs under `node
   --experimental-strip-types --test`, which cannot resolve
   `@/` aliases and will not load `@vercel/analytics`.
   Importing either sink here would make the decisions
   untestable, which is precisely the part worth testing. The
   sinks are handed IN, via `registerSink` — lib/lenis.ts's
   `registerLenis` shape, down to the pending-work detail.

   ── TWO EVENTS THAT LOOK LIKE ONE AND MUST NOT MERGE ──
   `case_study_opened` means "clicked through from somewhere
   on the site". A direct visit to /work/ludex — a shared
   link, a search result — is a PAGEVIEW, and both Vercel and
   GA4 already count it. Do NOT fire `case_study_opened` on
   route mount. Keeping them apart is what lets you ask "of
   the readers who reach the home page, how many open a
   study", which is the question; merging them makes both
   numbers unanalysable. This is the single most likely thing
   for a later change to get wrong.
   ══════════════════════════════════════════════════════ */

/**
 * Every event the site can send.
 *
 * A union, so a typo is a compile error rather than a category that appears
 * in the dashboard once and is never seen again — the price this repo already
 * pays for `SECTION_IDS` and for `data-cursor`'s `if (v in STATES)`.
 *
 * ── snake_case, NOT the site's `namespace:verb` habit, and that is forced ──
 * GA4 rejects event names that do not match `[A-Za-z][A-Za-z0-9_]{0,39}` — a
 * colon does not survive. One wire name has to satisfy both sinks, which is
 * the entire point of having one funnel.
 *
 * ── Two GA4 collisions, both deliberate ──
 * `file_download` is a RESERVED GA4 Enhanced Measurement name and fires
 * automatically for `.pdf` hrefs; ours is `pdf_opened` so the two stay
 * separate rows rather than one merged number you cannot pull apart. GA4
 * likewise emits its own `click` with `outbound: true` for cross-origin
 * anchors; ours is `outbound_clicked`. Expect both of each in the dashboard.
 */
export type AnalyticsEvent =
    | "gate_entered"
    | "gate_abandoned"
    | "case_study_opened"
    | "resume_viewed"
    | "pdf_opened"
    | "contact_clicked"
    | "outbound_clicked"
    | "palette_opened"
    | "game_found"
    | "copy_link"
    | "copy_email"
    | "print_page"
    | "replay_entrance";

/**
 * The intersection of what both sinks accept. Vercel rejects nested objects
 * outright and caps names, keys and values at 255 characters; GA4 takes
 * scalars. Anything richer arrives as `[object Object]`, silently.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

export interface Classified {
    name: AnalyticsEvent;
    props: AnalyticsProps;
}

const EVENTS: readonly AnalyticsEvent[] = [
    "gate_entered",
    "gate_abandoned",
    "case_study_opened",
    "resume_viewed",
    "pdf_opened",
    "contact_clicked",
    "outbound_clicked",
    "palette_opened",
    "game_found",
    "copy_link",
    "copy_email",
    "print_page",
    "replay_entrance",
];

function isEvent(v: string | null): v is AnalyticsEvent {
    return v !== null && (EVENTS as readonly string[]).includes(v);
}

/* ══════════════════════════════════════════════════════
   The classifier
   ══════════════════════════════════════════════════════ */

export interface ClickInput {
    /** The raw `href` attribute, exactly as authored. */
    href: string;
    /** `location.origin` at click time. */
    origin: string;
    /** `location.pathname` at click time — this is what makes `from` work. */
    pathname: string;
    /** `closest("section[id]")?.id`, or null. */
    sectionId: string | null;
    /** `data-analytics`. */
    tag: string | null;
    /** `data-analytics-surface`. */
    surface: string | null;
}

const WORK_PATH = /^\/work\/([^/]+)$/;

function resolve(href: string, origin: string, pathname: string): URL | null {
    try {
        return new URL(href, origin + pathname);
    } catch {
        return null;
    }
}

/**
 * Turn one click into an event, or into nothing.
 *
 * Pure, and every rule below is a case in lib/analytics.test.ts. The order
 * matters and is not arbitrary.
 */
export function classifyClick(input: ClickInput): Classified | null {
    const { href, origin, pathname, sectionId, tag, surface } = input;
    const section = sectionId ?? "unknown";

    /* 1 — EXPLICIT BEATS DERIVED. An element that names its own event gets
       it, and `data-analytics-surface` rides along. That is how the three
       Resume anchors report "resume_viewed / rail | island | hero" instead of
       falling through to rule 7 as three identical `outbound_clicked`s at
       drive.google.com.

       An UNKNOWN `data-analytics` value falls through to derivation rather
       than emitting a garbage name: a typo in markup should degrade to the
       sensible default, not invent a category. */
    if (isEvent(tag)) {
        return { name: tag, props: surface ? { surface } : {} };
    }

    const raw = href.trim();

    /* 2 — IN-PAGE ANCHORS ARE NOT EVENTS, AND THIS RULE IS LOAD-BEARING.
       SideNav's rail is seven `href="#…"` anchors, and the easter egg is FIVE
       clicks on them inside 2000ms. Without this, one attempt at the egg posts
       five events, and a 50k/month budget gets spent on somebody scrolling.
       ScrollProvider runs Lenis with `anchors: true`, so these are not
       navigations at all. */
    if (!raw || raw.startsWith("#") || /^javascript:/i.test(raw)) return null;

    const u = resolve(raw, origin, pathname);
    if (!u) return null;

    /* 3 — mailto. */
    if (u.protocol === "mailto:") {
        return {
            name: "contact_clicked",
            props: { channel: "email", surface: section },
        };
    }

    const sameOrigin = u.origin === origin;

    /* 4 — A case study, clicked through from somewhere on the site. `from`
       separates the home page's choreographed zone from a sibling /work/*
       route and from the palette. See the header on why this must never be
       merged with a /work/* pageview. */
    if (sameOrigin) {
        const work = WORK_PATH.exec(u.pathname);
        if (work) {
            return {
                name: "case_study_opened",
                props: {
                    slug: work[1],
                    from: pathname === "/" ? "zone" : "route",
                },
            };
        }
    }

    /* 5 — A PDF, wherever it is hosted. `u.pathname` has already dropped the
       query, so `/report.pdf?v=2` still counts. The technical reports are the
       strongest artifacts on the site; whether anyone opens them earns a row. */
    if (u.pathname.toLowerCase().endsWith(".pdf")) {
        return { name: "pdf_opened", props: { file: u.pathname, section } };
    }

    if (!sameOrigin) {
        /* 6/7 — THE INTERESTING PAIR, AND THE ONE MOST LIKELY TO BE WRONG.
           github.com appears in TWO unrelated places: Contact.tsx, where it is
           a contact click, and every case study's CTA row in
           lib/caseStudies.ts, where it emphatically is not. Gating on the
           enclosing section is what keeps `contact_clicked` meaning what its
           name says. Get this wrong and the number still looks plausible — it
           is just measuring something else. */
        const host = u.hostname.toLowerCase();
        if (section === "contact") {
            if (host.includes("linkedin.com")) {
                return {
                    name: "contact_clicked",
                    props: { channel: "linkedin", surface: section },
                };
            }
            if (host.includes("github.com")) {
                return {
                    name: "contact_clicked",
                    props: { channel: "github", surface: section },
                };
            }
        }
        return { name: "outbound_clicked", props: { host, section } };
    }

    /* 8 — Same-origin and none of the above: the logo home link, a nav
       fallback. Navigation within the site is a pageview, not an event. */
    return null;
}

/**
 * The command palette's own mapping.
 *
 * It needs an imperative call rather than the delegated listener because
 * `openExternal` is `window.open`, not an anchor click — there is no DOM event
 * for the listener to see. One call site covers five surfaces.
 *
 * Routed through the SAME named events as the DOM surfaces rather than a
 * parallel `command_run` funnel, so "how many resume views" stays a single
 * answerable number instead of two you have to remember to add up.
 *
 * `slugs` and `reportUrl` are passed in rather than imported, to keep this
 * module's zero-import rule. The seven NAV section ids fall through to null.
 */
export function paletteEvent(
    id: string,
    slugs: readonly string[],
    reportUrl: string,
): Classified | null {
    /* `pdf:<href>` — the PDF rows are derived from each study's own CTA list
       (lib/commands.ts), so their ids carry the file with them and one branch
       covers all of them, however many there come to be. This replaced a
       hardcoded `report` id that could only ever name one of the three. */
    if (id.startsWith("pdf:")) {
        return {
            name: "pdf_opened",
            props: { file: id.slice(4), section: "palette" },
        };
    }

    switch (id) {
        case "resume":
            return { name: "resume_viewed", props: { surface: "palette" } };
        case "report":
            /* Retired id, kept so a clearance written by an older deploy — or
               a bookmark of the old label — still reports as a PDF open rather
               than as nothing. */
            return {
                name: "pdf_opened",
                props: { file: reportUrl, section: "palette" },
            };
        case "copy-link":
            return { name: "copy_link", props: { surface: "palette" } };
        case "copy-email":
            return { name: "copy_email", props: { surface: "palette" } };
        case "print":
            return { name: "print_page", props: { surface: "palette" } };
        case "replay-entrance":
            return { name: "replay_entrance", props: { surface: "palette" } };
        case "github":
            return {
                name: "contact_clicked",
                props: { channel: "github", surface: "palette" },
            };
        case "stress-test":
            return { name: "game_found", props: { via: "palette" } };
    }
    if (slugs.includes(id)) {
        return {
            name: "case_study_opened",
            props: { slug: id, from: "palette" },
        };
    }
    return null;
}

/* ══════════════════════════════════════════════════════
   Opt-out
   ══════════════════════════════════════════════════════ */

/**
 * IT MUST AGREE WITH THE PRE-PAINT SCRIPT in app/layout.tsx, which cannot
 * import this module and therefore writes the string out again. Kept to a bare
 * literal with no internal format precisely so the two cannot drift — the
 * lesson components/SignalGate/gate.ts records about `"<at>:<ttl>"`.
 */
export const OPT_OUT_KEY = "analytics:off";

/**
 * What a query string is asking for, if anything.
 *
 * `?analytics=on` DELETING the key is not optional. Without an un-flag the
 * owner bricks their own device and has to open devtools to fix it, which
 * defeats the point of a switch that exists for your own machine.
 */
export function optOutIntent(search: string): "on" | "off" | null {
    let v: string | null = null;
    try {
        v = new URLSearchParams(search).get("analytics");
    } catch {
        return null;
    }
    if (v === null) return null;
    const t = v.trim().toLowerCase();
    return t === "off" ? "off" : t === "on" ? "on" : null;
}

/**
 * PRESENCE IS THE FLAG. The stored value is a timestamp, for the human who
 * opens devtools and wants to know when they set it — nothing reads it. `"0"`
 * is therefore opted OUT, and a test asserts exactly that, because "let's
 * treat falsy values as off" is precisely the tidy-up that breaks this.
 */
export function isOptedOut(stored: string | null): boolean {
    return stored !== null && stored !== "";
}

export function optOutValue(now: number): string {
    return String(now);
}

/* ══════════════════════════════════════════════════════
   The funnel
   ══════════════════════════════════════════════════════ */

type Sink = (name: AnalyticsEvent, props: AnalyticsProps) => void;

const sinks = new Map<string, Sink>();

/**
 * Events fired before a sink exists are held here and flushed to it at
 * registration — lib/lenis.ts's pending-lock detail, one module over, and for
 * the same class of reason: the thing that produces work mounts before the
 * thing that consumes it. GA in particular is deferred past the entrance.
 *
 * Bounded at 16, dropping the oldest. A portfolio session does not produce
 * sixteen events before hydration, and an unbounded queue on a page where no
 * sink ever registers is a leak nothing would report.
 */
const BUFFER_MAX = 16;
let buffer: Classified[] = [];

let optedOut: boolean | null = null;

/**
 * Resolved LAZILY and cached at module scope, exactly like `cachedDecision` in
 * SignalGate.tsx — and for a race, not for tidiness.
 *
 * Vercel's `<Analytics>` sends its first pageview from its own mount effect,
 * and effects fire bottom-up, so a PARENT effect that read localStorage would
 * lose that race and leak one pageview per opted-out load. Resolving here,
 * inside the function `vercelBeforeSend` calls at SEND time, cannot lose it.
 */
export function suppressed(): boolean {
    if (optedOut !== null) return optedOut;
    if (typeof window === "undefined") return false;
    try {
        optedOut = isOptedOut(window.localStorage.getItem(OPT_OUT_KEY));
    } catch {
        /* Private mode, disabled storage, quota. Failing open leaves analytics
           ON, which is the harmless direction for somebody who never asked to
           opt out. */
        optedOut = false;
    }
    return optedOut;
}

/** So the `?analytics=off` write takes effect on THIS load, not the next. */
export function setSuppressed(v: boolean): void {
    optedOut = v;
}

/**
 * Vercel's `beforeSend`. Returning null drops the event — which is how
 * PAGEVIEWS get suppressed too, not only the custom events below.
 */
export function vercelBeforeSend<T>(e: T): T | null {
    return suppressed() ? null : e;
}

export function registerSink(id: "vercel" | "ga", fn: Sink): () => void {
    sinks.set(id, fn);
    for (const q of buffer) fn(q.name, q.props);
    return () => {
        if (sinks.get(id) === fn) sinks.delete(id);
    };
}

/** Test seam only — the module is a singleton and cases must not bleed. */
export function resetForTest(): void {
    sinks.clear();
    buffer = [];
    optedOut = null;
}

export function track(name: AnalyticsEvent, props: AnalyticsProps = {}): void {
    if (typeof window === "undefined") return;
    if (suppressed()) return;

    if (process.env.NODE_ENV !== "production") {
        /* NOT a stub — this is the primary verification surface. CLAUDE.md's
           "Verifying in a browser" section makes anything rAF-dependent
           unreliable in the dev pane, and a console line is readable whether
           the pane is displayed or not.

           Literal hex rather than the CSS tokens, for the reason
           SignalGate.tsx's `announce()` records: devtools styles its own
           console and `var(--accent-text)` resolves to nothing there. */
        // eslint-disable-next-line no-console
        console.debug(
            `%c▸ ${name}%c ${JSON.stringify(props)}`,
            "color:#4D95C5;font-weight:600",
            "color:#98B8CD",
        );
        return;
    }

    if (sinks.size === 0) {
        buffer.push({ name, props });
        if (buffer.length > BUFFER_MAX) buffer.shift();
        return;
    }
    for (const fn of sinks.values()) {
        try {
            fn(name, props);
        } catch {
            /* A sink that throws must never break the click it was measuring.
               This runs inside a document-level CAPTURE listener sitting above
               every navigation on the site. */
        }
    }
}
