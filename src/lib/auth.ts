import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

/**
 * NextAuth is normally configured once at module load. On Cloudflare the
 * D1 binding is only reachable per-request (via getRequestContext), so
 * instead we build the NextAuth instance fresh on every call, using
 * whichever PrismaClient getDb() resolves for that request (the local
 * singleton in dev, or a D1-backed client in production). This is cheap —
 * NextAuth() just builds a config object, it doesn't open connections.
 */
async function buildAuth() {
  const db = await getDb();

  return NextAuth({
    adapter: PrismaAdapter(db),
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    trustHost: true,
    providers: [
      Credentials({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        authorize: async (credentials) => {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;
          if (!email || !password) return null;

          const user = await db.user.findUnique({ where: { email } });
          if (!user) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return { id: user.id, email: user.email, name: user.name };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) token.id = user.id;
        return token;
      },
      async session({ session, token }) {
        if (session.user) session.user.id = token.id as string;
        return session;
      },
    },
  });
}

export async function auth() {
  const instance = await buildAuth();
  return instance.auth();
}

export async function GET(req: NextRequest) {
  const instance = await buildAuth();
  return instance.handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const instance = await buildAuth();
  return instance.handlers.POST(req);
}
