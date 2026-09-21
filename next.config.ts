import type { NextConfig } from "next";

// Ensure Prisma can initialize during `next build` on hosts that omit DATABASE_URL
// (Vercel) or only mount the DB disk at runtime (Render).
// Prefer setting DATABASE_URL in the npm `build` / `vercel-build` scripts so all
// Next.js workers inherit it. Do NOT put DATABASE_URL in `env: {}` — that would
// bake the build-time SQLite path into the runtime bundle.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./build.db";
}

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: '/member/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
      {
        source: '/member',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
