import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* The Double U-Net figures are authored as AVIF. Without this, Next's
       default output format is WebP only, so those sources would be
       transcoded to a larger format than they started in. */
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
