import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* `next build` and `next dev` both write to `.next`, so running a build
     while a dev server is up corrupts the chunks the dev server is serving.
     The symptom is not an error: the page keeps loading but arrives without
     its stylesheet, so it renders as unstyled content on the browser's
     default white canvas. That has happened here.

     Setting this from the environment means a verification build can be sent
     somewhere else entirely:

         BUILD_DIR=.next-verify npx next build

     Deployment is unaffected, because with the variable unset this is exactly
     the default. */
  distDir: process.env.BUILD_DIR || ".next",

  /* ── The Google barrel ships four components; we import one ──
     `@next/third-parties/google` re-exports GoogleAnalytics, GoogleTagManager,
     GoogleMapsEmbed and YouTubeEmbed from one index. A named import from that
     barrel pulls the whole file in, so a build that uses only GoogleAnalytics
     was still shipping the GTM, Maps and YouTube components to every visitor —
     confirmed by grepping the built chunk for `YouTubeEmbed`, which was there.

     This rewrites the barrel import to the specific module at build time. The
     package has no subpath exports, so a hand-written deep import is not an
     option; this is the supported mechanism. */
  experimental: {
    optimizePackageImports: ["@next/third-parties"],
  },

  images: {
    /* The Double U-Net figures are authored as AVIF. Without this, Next's
       default output format is WebP only, so those sources would be
       transcoded to a larger format than they started in. */
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
