import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    // Only ever imported locally (see src/lib/db.ts) and pull in a native
    // addon (better-sqlite3) that can't run on Cloudflare Workers. Keeping
    // them external stops the bundler from trying to package them into the
    // Worker build at all.
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    // Keep Prisma's generated client external during `next build` so it
    // stays as a real require()/import(), instead of being inlined using
    // Node's module resolution. OpenNext's own bundling pass (which does
    // use Cloudflare's "workerd" condition) then resolves it correctly to
    // the WASM-import-friendly edge build instead of the one that tries to
    // compile WASM at runtime — which Workers blocks.
    "@prisma/client",
    ".prisma/client",
  ],
};

export default nextConfig;
