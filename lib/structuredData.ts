/* Explicit `.ts`, deliberately — lib/structuredData.test.ts runs under Node's
   ESM resolver, which needs the extension and cannot resolve `@/`.
   `allowImportingTsExtensions` in tsconfig.json exists for this, and CLAUDE.md
   says not to "fix" these to extensionless. */
import {
    EMAIL,
    GITHUB_URL,
    JOB_TITLE,
    KNOWS_ABOUT,
    LINKEDIN_URL,
    SCHOOL_NAME,
    SCHOOL_URL,
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_TITLE,
    SITE_URL,
    absolute,
} from "./site.ts";
import { CASE_STUDIES, caseStudyBySlug } from "./caseStudies.ts";

/* ══════════════════════════════════════════════════════
   Structured data

   ── WHAT IT IS ACTUALLY FOR, stated plainly ──
   Not rich results. Google's Article rich results are
   effectively unavailable to personal sites now, and nothing
   below is going to change that. The value here is
   RETRIEVAL: an assistant answering "has anyone extended
   Double U-Net to ternary segmentation" being able to say
   whose work it was, with a URL. That is the same audience
   app/robots.ts declines to block.

   Pure, and tested. Every field is a static constant —
   NOTHING here may come from `Date.now()` or `new Date()`.
   These nodes are rendered by a server component into HTML
   that React then hydrates against; a computed date would
   mismatch on every render straddling midnight UTC.
   (Contact.tsx gets away with `new Date().getFullYear()`
   only because year boundaries are rare.)
   ══════════════════════════════════════════════════════ */

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function personLd(): object {
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": PERSON_ID,
        name: SITE_NAME,
        /* Bare origin, no trailing slash — this must agree with the
           rendered `<link rel="canonical">` and with app/sitemap.ts. Next
           resolves `canonical: "/"` to the bare origin; see the note there. */
        url: SITE_URL,
        image: absolute("/aditya-twitter-card.png"),
        jobTitle: JOB_TITLE,
        description: SITE_DESCRIPTION,
        /* `email`, and NOT an entry in `sameAs`. That property is for profile
           URLs that identify the same entity; an address is not one, it is
           wrong per schema.org's own definition, and a validator flags it.
           The mistake is common enough to be worth the comment. */
        email: `mailto:${EMAIL}`,
        /* `alumniOf` SLIGHTLY OVERSTATES — he is a current undergrad, and this
           property implies graduation. schema.org has no `studiesAt`, this is
           the property every knowledge-graph consumer actually reads, and
           `description` above already says "CS undergrad". Recorded as a
           tradeoff rather than left to look like an accident. */
        alumniOf: {
            "@type": "CollegeOrUniversity",
            name: SCHOOL_NAME,
            sameAs: SCHOOL_URL,
        },
        knowsAbout: [...KNOWS_ABOUT],
        sameAs: [GITHUB_URL, LINKEDIN_URL],
    };
}

export function websiteLd(): object {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_TITLE,
        inLanguage: "en-US",
        publisher: { "@id": PERSON_ID },
        /* NO `potentialAction: SearchAction`. The command palette is
           client-only with no query endpoint, so declaring one would advertise
           a search URL that does not exist. A validator will not catch that;
           a consumer following it will. */
    };
}

/**
 * One study.
 *
 * ── `TechArticle`, and the type is an argument ──
 * `ScholarlyArticle` OVERCLAIMS: it implies peer review and a venue, and
 * these are project write-ups. This is the codebase whose own copy says "A
 * coat is where it gives ground: accuracy drops to 45.36%" — overclaiming in
 * the machine-readable layer while being scrupulous in the human-readable one
 * would be exactly the wrong asymmetry. Plain `Article` is correct but says
 * nothing. `SoftwareSourceCode` describes the repo, not the page.
 *
 * ── THROWS on an unknown slug ──
 * All three routes are statically prerendered, so a data mismatch fails at
 * `next build` — loud, immediate, and at the only moment it can be fixed
 * cheaply. The alternative is a `!` non-null assertion at three call sites.
 */
export function caseStudyLd(slug: string): object {
    const c = caseStudyBySlug(slug);
    if (!c) {
        throw new Error(
            `structuredData: no case study with slug "${slug}". ` +
                `Known: ${CASE_STUDIES.map((s) => s.slug).join(", ")}`,
        );
    }

    const url = `${SITE_URL}/work/${c.slug}`;

    /* Derived from the CTAs the page actually renders, so it cannot drift
       from what is on screen. This is what carries the DOI on
       modified-double-unet, which already links its source paper. */
    const citation = c.ctas
        .filter(
            (t) =>
                t.href.toLowerCase().endsWith(".pdf") ||
                t.href.includes("doi.org"),
        )
        .map((t) => ({
            "@type": "CreativeWork",
            name: t.label,
            url: absolute(t.href),
        }));

    const article: Record<string, unknown> = {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        url,
        headline: c.title,
        name: c.title,
        description: c.thesis,
        image: [absolute(c.cover.src)],
        datePublished: c.published,
        dateModified: c.updated,
        author: { "@id": PERSON_ID },
        publisher: { "@id": PERSON_ID },
        isPartOf: { "@id": WEBSITE_ID },
        about: c.tag.split("/").map((s) => s.trim()),
        keywords: c.stack,
    };
    if (citation.length) article.citation = citation;

    /* TWO ITEMS, not three. There is no /work index route, so a three-item
       breadcrumb would need `/#work` as its middle — a breadcrumb pointing at
       a fragment is legal but odd. Breadcrumbs are still a live Google rich
       result, which is why this is here at all. */
    const breadcrumb = {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
            },
            { "@type": "ListItem", position: 2, name: c.title, item: url },
        ],
    };

    /* One `@graph` rather than two script tags — same bytes, one node for a
       consumer to walk. */
    return { "@context": "https://schema.org", "@graph": [article, breadcrumb] };
}

/**
 * Serialise for `dangerouslySetInnerHTML`.
 *
 * The `<` escape is not theoretical hygiene. Every value above is a
 * hand-written constant today, so there is no injection path — but one stray
 * `<` in a `thesis` string would close the `</script>` early and the failure
 * mode is a visibly broken page, not a warning. One `replace`, and a test that
 * the output never contains a raw `<`.
 */
export function jsonLdHtml(node: object): string {
    return JSON.stringify(node).replace(/</g, "\\u003c");
}
