import path from "node:path";
import { defineConfig } from "prisma/config";

// Used by `prisma migrate` / `prisma generate` / `prisma studio` locally.
// Production (Cloudflare) never reads this file — it builds its own D1
// adapter at request time in src/lib/db.ts.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: { url: process.env.DATABASE_URL ?? "file:./dev.db" },
});
