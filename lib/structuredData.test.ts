import { test } from "node:test";
import assert from "node:assert/strict";

/* Explicit `.ts` — see the note at the top of lib/structuredData.ts. */
import {
    personLd,
    websiteLd,
    caseStudyLd,
    jsonLdHtml,
} from "./structuredData.ts";
import { SITE_URL, absolute } from "./site.ts";
import { CASE_STUDIES } from "./caseStudies.ts";

/** Every string value anywhere in a node, however deeply nested. */
function strings(node: unknown, out: string[] = []): string[] {
    if (typeof node === "string") out.push(node);
    else if (Array.isArray(node)) for (const v of node) strings(v, out);
    else if (node && typeof node === "object")
        for (const v of Object.values(node)) strings(v, out);
    return out;
}

/* ── Serialisation ────────────────────────────────────────────────────── */

test("jsonLdHtml never emits a raw '<'", () => {
    /* One stray `<` in a thesis string would close the </script> early, and
       the failure mode is a visibly broken page rather than a warning. */
    const hostile = { "@type": "Thing", name: "a </script><img> b" };
    const out = jsonLdHtml(hostile);
    assert.equal(out.includes("<"), false);
    assert.equal(out.includes("\\u003c"), true);
    /* Still valid JSON, and still the same string once parsed. */
    assert.equal(JSON.parse(out).name, "a </script><img> b");
});

test("every node round-trips through jsonLdHtml as valid JSON", () => {
    for (const node of [
        personLd(),
        websiteLd(),
        ...CASE_STUDIES.map((c) => caseStudyLd(c.slug)),
    ]) {
        assert.doesNotThrow(() => JSON.parse(jsonLdHtml(node)));
    }
});

/* ── URLs ─────────────────────────────────────────────────────────────── */

test("every site URL and @id is absolute, on SITE_URL, with no double slash", () => {
    const nodes = [
        personLd(),
        websiteLd(),
        ...CASE_STUDIES.map((c) => caseStudyLd(c.slug)),
    ];
    for (const v of nodes.flatMap((n) => strings(n))) {
        if (!v.startsWith(SITE_URL)) continue;
        assert.equal(
            v.slice("https://".length).includes("//"),
            false,
            `double slash in ${v}`,
        );
    }
});

test("absolute() is idempotent on shape and never returns a relative URL", () => {
    assert.equal(absolute("/x"), absolute("x"));
    assert.equal(absolute("/"), `${SITE_URL}/`);
    assert.equal(absolute("//a"), `${SITE_URL}/a`);
    /* An already-absolute URL passes through untouched — the DOI citations
       depend on this. */
    assert.equal(absolute("https://doi.org/10.1/2"), "https://doi.org/10.1/2");
    for (const p of ["/a", "a", "/a/b", "aditya-twitter-card.png"]) {
        assert.ok(absolute(p).startsWith("https://"), p);
    }
});

/* ── Person / WebSite ─────────────────────────────────────────────────── */

test("the email is in `email` and NOT in `sameAs`", () => {
    /* `sameAs` is for profile URLs identifying the same entity. An address in
       there is wrong per schema.org and a validator flags it. */
    const p = personLd() as Record<string, unknown>;
    assert.ok(String(p.email).startsWith("mailto:"));
    for (const s of p.sameAs as string[]) {
        assert.equal(s.startsWith("mailto:"), false);
        assert.ok(s.startsWith("https://"));
    }
});

test("the Person and WebSite nodes cross-reference by @id", () => {
    const p = personLd() as Record<string, unknown>;
    const w = websiteLd() as Record<string, Record<string, string>>;
    assert.equal(w.publisher["@id"], p["@id"]);
});

test("the WebSite declares no SearchAction it cannot serve", () => {
    assert.equal("potentialAction" in websiteLd(), false);
});

/* ── Case studies ─────────────────────────────────────────────────────── */

test("caseStudyLd throws on an unknown slug", () => {
    assert.throws(() => caseStudyLd("nope"), /no case study with slug/);
});

test("every study produces a complete TechArticle", () => {
    for (const c of CASE_STUDIES) {
        const graph = (caseStudyLd(c.slug) as { "@graph": Record<string, unknown>[] })[
            "@graph"
        ];
        const a = graph[0];
        assert.equal(a["@type"], "TechArticle");
        assert.equal(a.headline, c.title);
        assert.ok(String(a.description).length > 0, c.slug);
        assert.ok((a.keywords as string[]).length > 0, c.slug);
        assert.ok((a.image as string[])[0].startsWith("https://"), c.slug);
        assert.equal(a.datePublished, c.published);
        assert.equal(a.dateModified, c.updated);
        assert.equal(a.url, `${SITE_URL}/work/${c.slug}`);
    }
});

test("the breadcrumb is two items, Home then the title", () => {
    for (const c of CASE_STUDIES) {
        const graph = (caseStudyLd(c.slug) as { "@graph": Record<string, unknown>[] })[
            "@graph"
        ];
        const b = graph[1];
        assert.equal(b["@type"], "BreadcrumbList");
        const items = b.itemListElement as Record<string, unknown>[];
        assert.equal(items.length, 2);
        assert.equal(items[0].item, SITE_URL);
        assert.equal(items[1].name, c.title);
    }
});

test("citations are derived from the page's own CTAs, never invented", () => {
    for (const c of CASE_STUDIES) {
        const a = (caseStudyLd(c.slug) as { "@graph": Record<string, unknown>[] })[
            "@graph"
        ][0];
        const expected = c.ctas.filter(
            (t) =>
                t.href.toLowerCase().endsWith(".pdf") ||
                t.href.includes("doi.org"),
        );
        const got = (a.citation ?? []) as unknown[];
        assert.equal(got.length, expected.length, c.slug);
    }
});

/* ── The dates, which is the highest-value assertion here ─────────────── */

test("published and updated are well-formed, and updated is never earlier", () => {
    /* These are HAND-BUMPED. A malformed `lastmod` is silently dropped by
       Google and nothing on the site changes, so this is the only thing
       standing between a typo and a sitemap field that quietly stops
       working. */
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    for (const c of CASE_STUDIES) {
        assert.match(c.published, ISO, `${c.slug} published`);
        assert.match(c.updated, ISO, `${c.slug} updated`);
        const p = Date.parse(c.published);
        const u = Date.parse(c.updated);
        assert.ok(Number.isFinite(p), `${c.slug} published unparseable`);
        assert.ok(Number.isFinite(u), `${c.slug} updated unparseable`);
        assert.ok(u >= p, `${c.slug}: updated is before published`);
    }
});

test("every slug is unique — the sitemap emits one <url> per entry", () => {
    const slugs = CASE_STUDIES.map((c) => c.slug);
    assert.equal(new Set(slugs).size, slugs.length);
});
