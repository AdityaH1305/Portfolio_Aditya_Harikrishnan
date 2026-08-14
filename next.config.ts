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

  images: {
    /* The Double U-Net figures are authored as AVIF. Without this, Next's
       default output format is WebP only, so those sources would be
       transcoded to a larger format than they started in. */
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
