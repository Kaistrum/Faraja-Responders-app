import type { NextConfig } from "next";

// Base URL of the RAPIDA Django API, ending in "/api" (see .env.local.example).
// Read at BUILD time to bake the proxy destination into the rewrite below, so
// on Vercel this must be set as a project env var. The browser only ever talks
// to /api/proxy/* (same-origin), which this rewrites to the plain-HTTP backend
// server-side — avoiding mixed-content blocking on an HTTPS deployment.
const RAPIDA_API_BASE = (process.env.RAPIDA_API_BASE ?? "http://localhost:8000/api").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: "standalone",
  // DRF requires trailing slashes; without this Next 308-redirects
  // "/api/proxy/.../" → "/.../" before the rewrite runs, dropping the slash
  // and breaking the proxied request.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        // :path(.*) captures the full remainder including any trailing slash,
        // which :path* would drop — DRF needs the slash preserved.
        source: "/api/proxy/:path(.*)",
        destination: `${RAPIDA_API_BASE}/:path`,
      },
    ];
  },
};

export default nextConfig;
