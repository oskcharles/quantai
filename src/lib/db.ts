import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

async function createLocalClient(): Promise<PrismaClient> {
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

/**
 * On Cloudflare there is no filesystem and no long-lived global scope — the
 * D1 binding is only reachable per-request via OpenNext's Cloudflare
 * context. So every route calls getDb() to get a PrismaClient: locally
 * that's a cached singleton over a SQLite file (via better-sqlite3), in
 * production it's a fresh client built from that request's D1 binding.
 */
export async function getDb(): Promise<PrismaClient> {
  if (process.env.DATABASE_URL || process.env.NODE_ENV !== "production") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = await createLocalClient();
    }
    return globalForPrisma.prisma;
  }

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return new PrismaClient({ adapter: new PrismaD1(env.DB) });
}
