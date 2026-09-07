import type { MetadataRoute } from "next";
import { SITE_URL, HOME_UPDATED } from "@/lib/site";
import { CASE_STUDIES } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   sitemap.xml

   Four URLs. Next generates this at build time — it is a
   Route Handler with no request-time API, so it costs zero
   client bytes and stays static like the rest of the site.

   ── DERIVED FROM CASE_STUDIES, NOT LISTED ──
   A fourth case study updates the sitemap for free. That is
   the same argument lib/caseStudies.ts makes for its own
   existence, and it is the reason `published`/`updated` are
   REQUIRED fields there: a new study cannot be added without
   a date, so this can never emit an entry with no `lastmod`.

   ── NO `priority`, NO `changeFrequency`, AND THAT IS A
      DELETION RATHER THAN AN OMISSION ──
   Google has stated publicly that it ignores both. On a
   four-URL sitemap they carry literally zero information —
   the crawler fetches all four regardless of what we claim
   about their relative importance. Emitting them is cargo
   cult, and this codebase deletes things that do nothing on
   principle: the 600 font weight, `--edge-key`,
   `.section-divide`, `wave.ts`. Do not re-add them.

   ── THE HOME ENTRY MUST MATCH THE CANONICAL BYTE FOR BYTE,
      AND IT HAS NO TRAILING SLASH ──
   app/layout.tsx sets `alternates: { canonical: "/" }`, and
   Next resolves that against `metadataBase` to the BARE
   origin — measured: the rendered tag is
   `<link rel="canonical" href="https://…vercel.app"/>`, with
   no trailing slash. `<SITE_URL>/` here and `<SITE_URL>` on
   the page is a Search Console "Duplicate, submitted URL not
   selected as canonical", and nothing about either page looks
   wrong. The first version of this file had exactly that bug;
   it was caught by curl-diffing the two, which is the only
   way it shows.

   ── /404 IS DELIBERATELY ABSENT ──
   app/not-found.tsx already sets `robots: { index: false }`,
   and listing a noindex URL in a sitemap is a GSC warning.
   ══════════════════════════════════════════════════════ */

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: SITE_URL,
            lastModified: HOME_UPDATED,
        },
        ...CASE_STUDIES.map((c) => ({
            url: `${SITE_URL}/work/${c.slug}`,
            lastModified: c.updated,
        })),
    ];
}
