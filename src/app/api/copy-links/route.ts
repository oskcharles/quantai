import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

const schema = z.object({
  masterId: z.string().min(1),
  followerId: z.string().min(1),
  riskMultiplier: z.number().positive().max(100).default(1),
  maxLotSize: z.number().positive().max(1000).optional(),
  reverseCopy: z.boolean().default(false),
  symbolWhitelist: z.string().max(500).optional(),
});

export async function GET() {
  const prisma = await getDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await prisma.copyLink.findMany({
    where: { master: { userId: session.user.id } },
    include: { master: true, follower: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const prisma = await getDb();
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

  const { masterId, followerId } = parsed.data;
  if (masterId === followerId) {
    return NextResponse.json(
      { error: "Master and follower must be different accounts" },
      { status: 400 },
    );
  }

  const [master, follower] = await Promise.all([
    prisma.connection.findUnique({ where: { id: masterId } }),
    prisma.connection.findUnique({ where: { id: followerId } }),
  ]);

  if (
    !master ||
    !follower ||
    master.userId !== session.user.id ||
    follower.userId !== session.user.id
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (master.role !== "MASTER" || follower.role !== "FOLLOWER") {
    return NextResponse.json(
      { error: "Master must have role MASTER and follower must have role FOLLOWER" },
      { status: 400 },
    );
  }

  const link = await prisma.copyLink.create({
    data: parsed.data,
    include: { master: true, follower: true },
  });

  return NextResponse.json(link, { status: 201 });
}
