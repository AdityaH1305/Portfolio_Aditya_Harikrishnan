import type { MetadataRoute } from "next";
import {
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_TITLE,
    SURFACE_0,
} from "@/lib/site";

/* ══════════════════════════════════════════════════════
   Web app manifest

   Generated at build time like sitemap.ts and robots.ts, so
   it costs zero client bytes and stays static.

   ── IT CHANGES NOTHING ON THE PAGE ──
   A manifest is read by the browser, not rendered by it. What
   it affects is chrome: the name and icon if someone installs
   the site or pins it to a home screen, and the address-bar
   tint on Android. Nothing in the document moves.

   ── `display: "browser"`, NOT "standalone" ──
   Standalone is the reflex and it is wrong here. This is a
   portfolio, not an app: every outbound link — the resume on
   Drive, the papers, GitHub, LinkedIn — would open inside a
   chromeless window with no address bar and no obvious way
   back. A reader who installs this should get the site with
   its browser intact.

   ── No `screenshots`, no `shortcuts` ──
   Both are real manifest features and both would be filled in
   with guesses. Shortcuts in particular duplicate the command
   palette, which already exists on every route and is better.
   ══════════════════════════════════════════════════════ */

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE_TITLE,
        short_name: SITE_NAME,
        description: SITE_DESCRIPTION,
        start_url: "/",
        display: "browser",
        /* Both from lib/site.ts, which app/layout.tsx's `themeColor` and its
           pre-stylesheet inline background also read. One constant, so the
           installed tile can never disagree with the page it opens. */
        background_color: SURFACE_0,
        theme_color: SURFACE_0,
        /* `icon.tsx` and `apple-icon.tsx` are picked up by Next's metadata
           conventions and injected here automatically — listing them again
           would be a second source of truth for the same two files. */
    };
}
