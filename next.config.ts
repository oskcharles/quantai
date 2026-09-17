import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These are only ever imported locally (see src/lib/db.ts) and pull in a
  // native addon (better-sqlite3) that can't run on Cloudflare Workers.
  // Keeping them external stops the bundler from trying to package them
  // into the Worker build at all.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
