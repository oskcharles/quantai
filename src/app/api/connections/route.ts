import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BROKER_PLATFORMS, CONNECTION_ROLES } from "@/lib/constants";

const schema = z.object({
  label: z.string().min(1).max(100),
  platform: z.enum(BROKER_PLATFORMS),
  role: z.enum(CONNECTION_ROLES),
  accountId: z.string().min(1).max(100),
  server: z.string().max(200).optional(),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.connection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(connections);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  if (parsed.data.platform !== "PAPER" && (!parsed.data.apiKey || !parsed.data.server)) {
    return NextResponse.json(
      { error: `${parsed.data.platform} connections need a server and API key/token.` },
      { status: 400 },
    );
  }

  const connection = await prisma.connection.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(connection, { status: 201 });
}
