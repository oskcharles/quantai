import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBrokerAdapter } from "@/lib/brokers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: { connection: true },
  });
  if (!trade || trade.connection.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (trade.status === "CLOSED") {
    return NextResponse.json({ error: "Already closed" }, { status: 400 });
  }

  const adapter = getBrokerAdapter(trade.connection);
  const { closePrice } = await adapter.closePosition(trade.ticketId);

  const updated = await prisma.trade.update({
    where: { id },
    data: { status: "CLOSED", closePrice, closedAt: new Date() },
  });

  return NextResponse.json(updated);
}
