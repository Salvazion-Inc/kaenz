import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["leaflet"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kaenz.com" },
      { protocol: "https", hostname: "www.kaenz.com" },
      { protocol: "https", hostname: "media.canva.com" },
      { protocol: "https", hostname: "mqkyzkrpoinbvclxurfg.supabase.co" },
      { protocol: "https", hostname: "server.arcgisonline.com" },
      { protocol: "https", hostname: "services.arcgisonline.com" },
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
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/auth/login",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/auth/signup",
        destination: "/signup",
        permanent: true,
      },
      {
        source: "/app/request",
        destination: "/app/trip",
        permanent: true,
      },
      {
        source: "/book",
        destination: "/fleet",
        permanent: true,
      },
      {
        source: "/concierge",
        destination: "/",
        permanent: true,
      },
      {
        source: "/yachts",
        destination: "/fleet",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
