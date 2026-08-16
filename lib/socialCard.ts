/* ══════════════════════════════════════════════════════
   The social card

   One designed image for every URL on the site. It replaced
   four generated cards — `app/opengraph-image.tsx` plus one
   per case study, all rendered through satori at request
   time — so a link to a write-up previews the same as a link
   to the home page. That was the intent: one recognisable
   thumbnail wherever the site is shared.

   ── Why this is a module and not a const in layout.tsx ──
   Next REPLACES `openGraph` wholesale when a route declares
   its own; it does not deep-merge. The three case studies
   each set `openGraph` for their title and description, and
   that silently dropped the inherited `images` — measured,
   `/work/ludex` served a `twitter:image` and no `og:image`
   at all, so every scraper that reads Open Graph (Facebook,
   LinkedIn, WhatsApp, Slack, Discord) previewed those links
   with no picture.

   It went unnoticed because the per-route `opengraph-image`
   files used to supply that tag through a different
   mechanism. Deleting them exposed the gap. So every route
   that declares `openGraph` must spread this in, and there
   is exactly one copy of it to spread.
   ══════════════════════════════════════════════════════ */

/**
 * 1200×630 is what both Open Graph and Twitter's
 * `summary_large_image` want; anything else gets cropped by someone.
 *
 * The path is root-relative and resolved against `metadataBase` in
 * `app/layout.tsx`. Scrapers reject relative URLs outright, and the failure is
 * invisible locally — the tag renders, the preview is just blank.
 */
export const OG_IMAGE = {
    url: "/aditya-twitter-card.png",
    width: 1200,
    height: 630,
    alt: "Aditya Harikrishnan — ML Systems & Full-Stack Engineering",
} as const;
