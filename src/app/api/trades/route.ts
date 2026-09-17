import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const prisma = await getDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trades = await prisma.trade.findMany({
    where: { connection: { userId: session.user.id } },
    include: { connection: true },
    orderBy: { openedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(trades);
}
