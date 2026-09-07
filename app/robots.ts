import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* ══════════════════════════════════════════════════════
   robots.txt

   One `User-agent: *` group, and the SILENCE about AI
   crawlers below is the recommendation rather than an
   oversight. Comments do not reach the generated file, so
   they are here for the next reader instead.

   ── AI CRAWLERS ARE ALLOWED, BY SAYING NOTHING ──
   For a personal portfolio the entire point is
   discoverability, and a recruiter increasingly asks an
   assistant rather than a search box. Being in GPTBot /
   ClaudeBot / CCBot / PerplexityBot's corpus is pure upside:
   there is no ad model here and no paywall to cannibalise.

   So the answer is yes — but do NOT write an explicit
   allow-list. A named `User-agent: GPTBot` group REPLACES the
   `*` group for that bot rather than adding to it, so every
   named group would have to restate the disallow below, and
   a future edit to `*` would silently not apply to any of
   them. The most robust "yes" is saying nothing at all. Same
   for `Google-Extended` and `Applebot-Extended`, which are
   opt-OUT tokens: silence already means allowed.

   ── WHY /_next/ IS NOT DISALLOWED ──
   Google needs the JS and CSS to render the page, and this
   site is heavily client-rendered. Blocking it is the classic
   self-inflicted wound and a common "hardening" instinct.
   Leave it.

   ── WHY THE PDFs ARE NOT DISALLOWED ──
   The four technical reports are the strongest artifacts on
   the site, and PDFs rank well. They should be found.
   ══════════════════════════════════════════════════════ */

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                /* Committed Python source plus public/spaceInvaders/
                   __pycache__/*.pyc — binary junk that is not content anyone
                   should reach from a search result.

                   STATE THE LIMIT HONESTLY: robots.txt does not remove
                   anything already indexed and does not stop the files being
                   served. If the goal is "these should not be public", the
                   real fix is deleting __pycache__/ from git, which is a
                   separate and better change. */
                disallow: ["/spaceInvaders/"],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        /* `Host:` is a Yandex-only directive — Google and Bing ignore it —
           and it must be a BARE hostname, not a URL with a scheme. Hence the
           `new URL().host` rather than SITE_URL itself. */
        host: new URL(SITE_URL).host,
    };
}
