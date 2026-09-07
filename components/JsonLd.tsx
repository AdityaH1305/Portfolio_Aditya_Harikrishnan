import { jsonLdHtml } from "@/lib/structuredData";

/* ══════════════════════════════════════════════════════
   One JSON-LD node

   A SERVER component — no "use client". Four call sites
   would otherwise repeat the `dangerouslySetInnerHTML`
   incantation, and the `<` escape with it.

   ── RENDERED IN <body>, NOT <head> ──
   A `type="application/ld+json"` script is never executed, so
   it blocks nothing wherever it sits. But <head> here holds
   two deliberately tiny pre-paint scripts whose whole value
   is being verifiable by eye, and a kilobyte of JSON in
   there dilutes exactly that.

   React 19 hoists <title>, <meta>, <link> and <script async>
   to the head on its own; a TYPED, non-async script is not
   hoisted, so it stays where it is put.
   ══════════════════════════════════════════════════════ */

export default function JsonLd({ data }: { data: object }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
        />
    );
}
