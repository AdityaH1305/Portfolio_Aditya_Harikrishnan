import { test } from "node:test";
import assert from "node:assert/strict";

/* Explicit `.ts`, deliberately. Node's ESM resolver needs the extension and
   `@/` aliases do not resolve here — `allowImportingTsExtensions` in
   tsconfig.json exists for exactly this, and CLAUDE.md says not to "fix" it. */
import {
    classifyClick,
    paletteEvent,
    optOutIntent,
    isOptedOut,
    optOutValue,
    type ClickInput,
} from "./analytics.ts";

const ORIGIN = "https://adityaharikrishnan.vercel.app";

/** A click, with everything defaulted to the boring case. */
function click(over: Partial<ClickInput>): ClickInput {
    return {
        href: "",
        origin: ORIGIN,
        pathname: "/",
        sectionId: null,
        tag: null,
        surface: null,
        ...over,
    };
}

/* ── Rule 2: nothing that is not a real destination ───────────────────── */

test("in-page anchors are not events", () => {
    assert.equal(classifyClick(click({ href: "#work" })), null);
    assert.equal(classifyClick(click({ href: "#" })), null);
});

test("empty and javascript: hrefs are not events", () => {
    assert.equal(classifyClick(click({ href: "" })), null);
    assert.equal(classifyClick(click({ href: "   " })), null);
    assert.equal(classifyClick(click({ href: "javascript:void(0)" })), null);
    assert.equal(classifyClick(click({ href: "JavaScript:void(0)" })), null);
});

test("the nav rail cannot produce events — five clicks, five nulls", () => {
    /* The easter egg is five clicks inside 2000ms on these very anchors. If
       this regresses, one attempt at the egg posts five events. */
    for (const id of ["intro", "research", "work", "projects", "stack"]) {
        assert.equal(
            classifyClick(click({ href: `#${id}`, sectionId: "intro" })),
            null,
        );
    }
});

/* ── Rule 3: mailto ───────────────────────────────────────────────────── */

test("mailto is a contact click, carrying its section", () => {
    const r = classifyClick(
        click({ href: "mailto:a@b.com", sectionId: "contact" }),
    );
    assert.deepEqual(r, {
        name: "contact_clicked",
        props: { channel: "email", surface: "contact" },
    });
});

test("mailto with a query is still a contact click", () => {
    const r = classifyClick(
        click({ href: "mailto:a@b.com?subject=Hi", sectionId: "contact" }),
    );
    assert.equal(r?.name, "contact_clicked");
    assert.equal(r?.props.channel, "email");
});

test("mailto outside a section reports an unknown surface, not a crash", () => {
    const r = classifyClick(click({ href: "mailto:a@b.com" }));
    assert.equal(r?.props.surface, "unknown");
});

/* ── Rule 4: case studies, and where they were opened from ────────────── */

test("a case study opened from the home page zone", () => {
    const r = classifyClick(click({ href: "/work/ludex", pathname: "/" }));
    assert.deepEqual(r, {
        name: "case_study_opened",
        props: { slug: "ludex", from: "zone" },
    });
});

test("a case study opened from a sibling route", () => {
    const r = classifyClick(
        click({ href: "/work/ludex", pathname: "/work/gait-multi-modal-fusion" }),
    );
    assert.equal(r?.props.from, "route");
    assert.equal(r?.props.slug, "ludex");
});

test("an absolute same-origin case study URL works too", () => {
    const r = classifyClick(click({ href: `${ORIGIN}/work/ludex` }));
    assert.equal(r?.name, "case_study_opened");
});

test("a deeper path under /work is not a case study", () => {
    assert.equal(classifyClick(click({ href: "/work/ludex/extra" })), null);
    assert.equal(classifyClick(click({ href: "/work" })), null);
});

/* ── Rule 5: PDFs ─────────────────────────────────────────────────────── */

test("a PDF is a pdf_opened, query stripped", () => {
    const a = classifyClick(
        click({ href: "/ludex-technical-report.pdf", sectionId: "work" }),
    );
    assert.deepEqual(a, {
        name: "pdf_opened",
        props: { file: "/ludex-technical-report.pdf", section: "work" },
    });

    const b = classifyClick(click({ href: "/report.pdf?v=2" }));
    assert.equal(b?.props.file, "/report.pdf");
});

test("a path merely containing pdf is not a PDF", () => {
    assert.equal(classifyClick(click({ href: "/pdfs/" })), null);
});

/* ── Rules 6 and 7: the pair that is easiest to get wrong ─────────────── */

test("GitHub in #contact is a contact click; the same URL in #work is not", () => {
    /* github.com appears in Contact.tsx AND in every case study's CTA row.
       This boundary is what keeps `contact_clicked` meaning what it says. */
    const contact = classifyClick(
        click({ href: "https://github.com/AdityaH1305", sectionId: "contact" }),
    );
    assert.deepEqual(contact, {
        name: "contact_clicked",
        props: { channel: "github", surface: "contact" },
    });

    const work = classifyClick(
        click({ href: "https://github.com/AdityaH1305", sectionId: "work" }),
    );
    assert.deepEqual(work, {
        name: "outbound_clicked",
        props: { host: "github.com", section: "work" },
    });
});

test("LinkedIn in #contact is a contact click", () => {
    const r = classifyClick(
        click({
            href: "https://www.linkedin.com/in/aditya-harikrishnan-3932192a4/",
            sectionId: "contact",
        }),
    );
    assert.equal(r?.name, "contact_clicked");
    assert.equal(r?.props.channel, "linkedin");
});

test("any other cross-origin link is outbound", () => {
    const r = classifyClick(
        click({ href: "https://doi.org/10.1109/TRPMS.2022.3221471", sectionId: "work" }),
    );
    assert.deepEqual(r, {
        name: "outbound_clicked",
        props: { host: "doi.org", section: "work" },
    });
});

/* ── Rule 1: the explicit tag ─────────────────────────────────────────── */

test("data-analytics overrides derivation, and surface rides along", () => {
    const r = classifyClick(
        click({
            href: "https://drive.google.com/file/d/xyz/view",
            tag: "resume_viewed",
            surface: "rail",
        }),
    );
    assert.deepEqual(r, {
        name: "resume_viewed",
        props: { surface: "rail" },
    });
});

test("a tag with no surface emits no empty surface key", () => {
    const r = classifyClick(click({ href: "/x", tag: "resume_viewed" }));
    assert.deepEqual(r, { name: "resume_viewed", props: {} });
});

test("an UNKNOWN data-analytics value falls through, never emits a garbage name", () => {
    /* A typo in markup should degrade to the sensible default, not invent a
       category that shows up once and is never seen again. */
    const r = classifyClick(
        click({
            href: "https://github.com/AdityaH1305",
            sectionId: "work",
            tag: "resoome_viewed",
        }),
    );
    assert.equal(r?.name, "outbound_clicked");
});

/* ── Rule 8 ───────────────────────────────────────────────────────────── */

test("same-origin navigation that is not a study or a PDF is not an event", () => {
    assert.equal(classifyClick(click({ href: "/", pathname: "/work/ludex" })), null);
});

/* ── The palette ──────────────────────────────────────────────────────── */

const SLUGS = ["gait-multi-modal-fusion", "ludex", "modified-double-unet"];
const REPORT = "/ludex-technical-report.pdf";

test("palette commands route to the same named events as the DOM surfaces", () => {
    assert.deepEqual(paletteEvent("resume", SLUGS, REPORT), {
        name: "resume_viewed",
        props: { surface: "palette" },
    });
    assert.deepEqual(paletteEvent("report", SLUGS, REPORT), {
        name: "pdf_opened",
        props: { file: REPORT, section: "palette" },
    });
    assert.deepEqual(paletteEvent("github", SLUGS, REPORT), {
        name: "contact_clicked",
        props: { channel: "github", surface: "palette" },
    });
    assert.deepEqual(paletteEvent("stress-test", SLUGS, REPORT), {
        name: "game_found",
        props: { via: "palette" },
    });
});

test("a palette case study reports from: palette", () => {
    assert.deepEqual(paletteEvent("ludex", SLUGS, REPORT), {
        name: "case_study_opened",
        props: { slug: "ludex", from: "palette" },
    });
});

test("the seven NAV section ids produce nothing", () => {
    for (const id of [
        "intro",
        "research",
        "work",
        "projects",
        "stack",
        "journey",
        "contact",
    ]) {
        assert.equal(paletteEvent(id, SLUGS, REPORT), null);
    }
});

/* ── Opt-out ──────────────────────────────────────────────────────────── */

test("optOutIntent reads only the analytics param", () => {
    assert.equal(optOutIntent("?analytics=off&x=1"), "off");
    assert.equal(optOutIntent("?x=1&analytics=on"), "on");
    assert.equal(optOutIntent("?x=analytics"), null);
    assert.equal(optOutIntent(""), null);
    assert.equal(optOutIntent("?analytics=maybe"), null);
});

test("optOutIntent is case- and whitespace-insensitive", () => {
    assert.equal(optOutIntent("?analytics=OFF"), "off");
    assert.equal(optOutIntent("?analytics=%20On%20"), "on");
});

test("PRESENCE is the flag — a stored '0' is still opted out", () => {
    /* This is the assertion a later "treat falsy values as off" cleanup
       breaks, and nothing on the site would look different afterwards. */
    assert.equal(isOptedOut("0"), true);
    assert.equal(isOptedOut(optOutValue(0)), true);
    assert.equal(isOptedOut(optOutValue(Date.now())), true);
    assert.equal(isOptedOut(""), false);
    assert.equal(isOptedOut(null), false);
});
