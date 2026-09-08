import { test } from "node:test";
import assert from "node:assert/strict";

import {
    commandsFor,
    filterCommands,
    isHome,
    ACTION_COPY_EMAIL,
    ACTION_GAME,
} from "./commands.ts";
import { CASE_STUDIES } from "./caseStudies.ts";

const HOME = commandsFor("/");
const WORK = commandsFor("/work/ludex");

/* ── The bug this module exists to make impossible ─────────────────────── */

test("Navigate scrolls on the home page and ROUTES everywhere else", () => {
    /* Seven rows used to call scrollToSection() unconditionally. On /work/*
       the ids are not in the document, so it returned early and the rows did
       nothing at all — present, selectable, silent. */
    const homeNav = HOME.filter((c) => c.section === "Navigate");
    const workNav = WORK.filter((c) => c.section === "Navigate");

    assert.equal(homeNav.length, 7);
    assert.equal(workNav.length, 7);

    for (const c of homeNav) assert.equal(c.kind, "scroll");
    for (const c of workNav) assert.equal(c.kind, "route");
});

test("off-home Navigate payloads are hash routes back to the home page", () => {
    const stack = WORK.find((c) => c.id === "stack");
    assert.equal(stack?.kind, "route");
    assert.equal(stack?.payload, "/#stack");
    /* RouteScrollReset leaves a hash navigation alone on purpose; without the
       leading "/" this would be a same-page hash and scroll nowhere. */
    for (const c of WORK.filter((c) => c.section === "Navigate")) {
        assert.ok(c.payload.startsWith("/#"), c.id);
    }
});

test("on the home page the payload is the bare section id", () => {
    for (const c of HOME.filter((c) => c.section === "Navigate")) {
        assert.equal(c.payload.includes("/"), false, c.id);
        assert.equal(c.payload.includes("#"), false, c.id);
    }
});

test("isHome treats only the root as home", () => {
    assert.equal(isHome("/"), true);
    assert.equal(isHome(""), true);
    assert.equal(isHome("/work/ludex"), false);
    assert.equal(isHome("/work"), false);
    assert.equal(isHome("/anything"), false);
});

/* ── Shape ─────────────────────────────────────────────────────────────── */

test("every command has a non-empty payload and a known kind", () => {
    const kinds = new Set(["scroll", "route", "external", "action"]);
    for (const list of [HOME, WORK]) {
        for (const c of list) {
            assert.ok(c.id.length > 0);
            assert.ok(c.label.length > 0);
            assert.ok(c.section.length > 0);
            assert.ok(c.payload.length > 0, c.id);
            assert.ok(kinds.has(c.kind), `${c.id} -> ${c.kind}`);
        }
    }
});

test("ids are unique — the palette keys rows by id", () => {
    for (const list of [HOME, WORK]) {
        const ids = list.map((c) => c.id);
        assert.equal(new Set(ids).size, ids.length);
    }
});

test("the route and home sets differ only in the Navigate section", () => {
    const strip = (l: typeof HOME) =>
        l.filter((c) => c.section !== "Navigate").map((c) => JSON.stringify(c));
    assert.deepEqual(strip(HOME), strip(WORK));
});

/* ── PDFs, derived from the studies' own CTAs ──────────────────────────── */

test("every PDF linked by a case study is reachable from the palette", () => {
    /* Before this, exactly one of the five was listed. Deriving them means a
       study that gains a paper gains a row without anyone remembering to. */
    const linked = new Set<string>();
    for (const s of CASE_STUDIES)
        for (const t of s.ctas)
            if (t.href.toLowerCase().endsWith(".pdf")) linked.add(t.href);

    const inPalette = new Set(
        HOME.filter((c) => c.id.startsWith("pdf:")).map((c) => c.payload),
    );

    /* Three today: two Gait papers and the Ludex report. `public/` also holds
       modified-double-unet-report.pdf and "Intern Report.pdf", neither of
       which is linked from any page — so neither appears here, and that is
       correct. Deriving from the CTA rows is what stops the palette
       advertising a document the site does not otherwise offer. */
    assert.equal(linked.size, 3);
    assert.deepEqual([...inPalette].sort(), [...linked].sort());
});

test("a PDF linked by two studies is listed once", () => {
    const ids = HOME.filter((c) => c.id.startsWith("pdf:")).map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
});

/* ── Case studies and actions ──────────────────────────────────────────── */

test("every case study has a row that routes to it", () => {
    for (const s of CASE_STUDIES) {
        const row = HOME.find((c) => c.id === s.slug);
        assert.equal(row?.kind, "route", s.slug);
        assert.equal(row?.payload, `/work/${s.slug}`);
    }
});

test("the named actions are present and carry their action name", () => {
    const game = HOME.find((c) => c.id === "stress-test");
    assert.equal(game?.kind, "action");
    assert.equal(game?.payload, ACTION_GAME);

    const email = HOME.find((c) => c.id === "copy-email");
    assert.equal(email?.payload, ACTION_COPY_EMAIL);
});

/* ── Filtering ─────────────────────────────────────────────────────────── */

test("filtering matches label, id AND section", () => {
    /* Label-only search meant "pdf" worked by accident and "links" found
       nothing. */
    assert.ok(filterCommands(HOME, "Ludex").length > 0);
    assert.ok(filterCommands(HOME, "links").length > 0, "section");
    assert.ok(filterCommands(HOME, "stress-test").length > 0, "id");
    assert.ok(filterCommands(HOME, "actions").length >= 3, "section");
});

test("filtering is case- and whitespace-insensitive, and empty returns all", () => {
    assert.equal(filterCommands(HOME, "").length, HOME.length);
    assert.equal(filterCommands(HOME, "   ").length, HOME.length);
    assert.deepEqual(
        filterCommands(HOME, "GITHUB").map((c) => c.id),
        filterCommands(HOME, "  github ").map((c) => c.id),
    );
});

test("a query that matches nothing returns an empty list, not everything", () => {
    assert.equal(filterCommands(HOME, "zzzznope").length, 0);
});

test("filterCommands never mutates its input", () => {
    const before = HOME.length;
    filterCommands(HOME, "github");
    assert.equal(HOME.length, before);
});
