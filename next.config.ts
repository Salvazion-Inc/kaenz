import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kaenz.com" },
      { protocol: "https", hostname: "media.canva.com" },
    ],
  },
};

export default nextConfig;
