/* Explicit `.ts` — lib/commands.test.ts runs under Node's ESM resolver, which
   needs the extension and cannot resolve `@/`. See lib/structuredData.ts. */
import { CASE_STUDIES } from "./caseStudies.ts";
import { EMAIL, GITHUB_URL, RESUME_URL } from "./site.ts";

/* ══════════════════════════════════════════════════════
   The command set

   Pure, and a function of the PATHNAME — which is the whole
   reason it moved out of the component.

   ── WHY THIS IS DESCRIPTORS AND NOT CLOSURES ──
   The palette used to build `{ …, action: () => scrollTo(id) }`
   inline. A closure cannot be asserted against, so the one
   thing worth testing here — that the right command does the
   right thing on the right route — was untestable, and got it
   wrong: all seven Navigate entries called `scrollToSection`,
   which returns early when `getElementById` is null. On every
   /work/* route those seven rows were present, selectable,
   and did NOTHING. Silent, and invisible in review.

   A `kind` + `payload` pair is data. The component owns the
   four verbs; this file owns which verb each row gets.

   ── The Navigate section is the route-dependent part ──
   On `/` the section ids exist, so it scrolls. Anywhere else
   they do not, so it routes to `/#<id>` — which works because
   components/RouteScrollReset.tsx deliberately leaves a hash
   navigation alone ("The back link is `/#work`").
   ══════════════════════════════════════════════════════ */

export type CommandKind =
    /** Scroll to a section on the page we are already on. */
    | "scroll"
    /** Client-side navigation, hash included. */
    | "route"
    /** New tab. */
    | "external"
    /** A named side effect the component performs. `payload` is the name. */
    | "action";

export interface CommandSpec {
    id: string;
    label: string;
    section: string;
    icon: string;
    kind: CommandKind;
    payload: string;
}

/**
 * The seven sections, in page order.
 *
 * A FOURTH COPY of the section contract — `SECTION_IDS` in
 * LivingArchitecture/stages.ts and `sections` in SideNav.tsx are the others,
 * and CLAUDE.md §1 records that they are index-aligned and must move together.
 * This one is not index-aligned to anything (order here is only the order rows
 * appear in the palette), but the IDS must still exist in that contract or the
 * row scrolls to nothing.
 */
const NAV: readonly { id: string; label: string; icon: string }[] = [
    { id: "intro", label: "Intro", icon: "↑" },
    { id: "research", label: "Approach", icon: "→" },
    { id: "work", label: "Projects", icon: "★" },
    { id: "projects", label: "Experiments", icon: "◆" },
    { id: "stack", label: "Stack", icon: "→" },
    { id: "journey", label: "Journey", icon: "→" },
    { id: "contact", label: "Contact", icon: "✉" },
];

/** Named side effects. The component maps these to functions. */
export const ACTION_COPY_LINK = "copy-link";
export const ACTION_COPY_EMAIL = "copy-email";
export const ACTION_PRINT = "print";
export const ACTION_GAME = "game";
export const ACTION_REPLAY_ENTRANCE = "replay-entrance";
export const ACTION_SHORTCUTS = "shortcuts";

/**
 * Every PDF the site hosts, recovered from the case studies' own CTA rows.
 *
 * Derived rather than listed, so a study that gains a paper gains a palette
 * row for free — and so the label can never disagree with the link the page
 * actually renders. Before this, exactly one of the five was reachable here.
 */
function pdfCommands(): CommandSpec[] {
    const seen = new Set<string>();
    const out: CommandSpec[] = [];

    for (const study of CASE_STUDIES) {
        for (const cta of study.ctas) {
            const href = cta.href;
            if (!href.toLowerCase().endsWith(".pdf")) continue;
            if (seen.has(href)) continue;
            seen.add(href);
            out.push({
                id: `pdf:${href}`,
                label: `${cta.label} — ${study.title} (PDF)`,
                section: "Links",
                icon: "↗",
                kind: "external",
                payload: href,
            });
        }
    }
    return out;
}

/** True for the home page, where the seven section ids are in the document. */
export function isHome(pathname: string): boolean {
    return pathname === "/" || pathname === "";
}

export function commandsFor(pathname: string): CommandSpec[] {
    const home = isHome(pathname);

    return [
        ...NAV.map(({ id, label, icon }) => ({
            id,
            label,
            section: "Navigate",
            icon,
            kind: (home ? "scroll" : "route") as CommandKind,
            payload: home ? id : `/#${id}`,
        })),

        ...CASE_STUDIES.map((study) => ({
            id: study.slug,
            label: study.title,
            section: "Projects",
            icon: "▸",
            kind: "route" as CommandKind,
            payload: `/work/${study.slug}`,
        })),

        {
            id: "resume",
            label: "Resume",
            section: "Links",
            icon: "↗",
            kind: "external" as CommandKind,
            payload: RESUME_URL,
        },
        ...pdfCommands(),
        {
            id: "github",
            label: "GitHub",
            section: "Links",
            icon: "↗",
            kind: "external" as CommandKind,
            payload: GITHUB_URL,
        },

        {
            id: "copy-link",
            label: "Copy link to this page",
            section: "Actions",
            icon: "⧉",
            kind: "action" as CommandKind,
            payload: ACTION_COPY_LINK,
        },
        {
            /* The address is displayed nowhere on the site as text — Contact
               and the mobile island are both `mailto:` anchors, so a reader
               with no mail client configured cannot get at it at all. */
            id: "copy-email",
            label: `Copy email address (${EMAIL})`,
            section: "Actions",
            icon: "⧉",
            kind: "action" as CommandKind,
            payload: ACTION_COPY_EMAIL,
        },
        {
            /* Pairs with the print stylesheet, and is what makes it
               discoverable — nothing else on the site mentions it. */
            id: "print",
            label: "Print or save as PDF",
            section: "Actions",
            icon: "⎙",
            kind: "action" as CommandKind,
            payload: ACTION_PRINT,
        },

        {
            id: "shortcuts",
            label: "Keyboard shortcuts",
            section: "Actions",
            icon: "⌘",
            kind: "action" as CommandKind,
            payload: ACTION_SHORTCUTS,
        },

        {
            id: "replay-entrance",
            label: "Replay the entrance",
            section: "System",
            icon: "↺",
            kind: "action" as CommandKind,
            payload: ACTION_REPLAY_ENTRANCE,
        },
        {
            id: "stress-test",
            label: "Initialize System Stress Test",
            section: "System",
            icon: "▶",
            kind: "action" as CommandKind,
            payload: ACTION_GAME,
        },
    ];
}

/**
 * Substring match over label, id AND section.
 *
 * It was label-only, which meant typing "pdf" found one row by accident (the
 * word was in its label) and typing "links" or "ludex" found nothing sensible.
 * Still substring, still no fuzzy library — the list is twenty rows.
 */
export function filterCommands(
    commands: readonly CommandSpec[],
    query: string,
): CommandSpec[] {
    const q = query.trim().toLowerCase();
    if (!q) return [...commands];
    return commands.filter(
        (c) =>
            c.label.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q) ||
            c.section.toLowerCase().includes(q),
    );
}
