import path from "path";
import type { NextConfig } from "next";
import { DISCOVERY_HEADERS } from "./lib/discoverability";
import {
  SECURITY_HEADERS,
  STATIC_ASSET_CACHE,
} from "./lib/security-headers";

const assetCache = [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A lockfile above this repo was being chosen as the tracing root.
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["leaflet"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: "https", hostname: "kaenz.com" },
      { protocol: "https", hostname: "www.kaenz.com" },
      { protocol: "https", hostname: "media.canva.com" },
      { protocol: "https", hostname: "mqkyzkrpoinbvclxurfg.supabase.co" },
      { protocol: "https", hostname: "server.arcgisonline.com" },
      { protocol: "https", hostname: "services.arcgisonline.com" },
    ],
  },
  async headers() {
    return [
      { source: "/(.*)", headers: [...SECURITY_HEADERS, ...DISCOVERY_HEADERS] },
      { source: "/fleet/:path*", headers: assetCache },
      { source: "/featured/:path*", headers: assetCache },
      { source: "/crew/:path*", headers: assetCache },
      { source: "/flags/:path*", headers: assetCache },
      { source: "/brand/:path*", headers: assetCache },
      { source: "/site/:path*", headers: assetCache },
      { source: "/hero.mp4", headers: assetCache },
      { source: "/hero-poster.jpg", headers: assetCache },
      { source: "/icon.png", headers: assetCache },
      { source: "/icon-512.png", headers: assetCache },
      { source: "/favicon.png", headers: assetCache },
      { source: "/apple-touch-icon.png", headers: assetCache },
    ];
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
  async rewrites() {
    return [
      { source: "/.well-known/llms.txt", destination: "/llms.txt" },
      { source: "/.well-known/llms-full.txt", destination: "/llms-full.txt" },
    ];
  },
};

export default nextConfig;
