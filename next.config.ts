import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kaenz.com" },
      { protocol: "https", hostname: "www.kaenz.com" },
      { protocol: "https", hostname: "media.canva.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/terms-and-conditions",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/terminos-y-condiciones",
        destination: "/terminos",
        permanent: true,
      },
      {
        source: "/es/terminos-y-condiciones",
        destination: "/terminos",
        permanent: true,
      },
      {
        source: "/es/terms-and-conditions",
        destination: "/terminos",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
