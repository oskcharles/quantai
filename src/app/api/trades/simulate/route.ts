import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBrokerAdapter } from "@/lib/brokers";
import { TRADE_SIDES } from "@/lib/constants";

const schema = z.object({
  connectionId: z.string().min(1),
  symbol: z.string().min(1).max(20),
  side: z.enum(TRADE_SIDES),
  volume: z.number().positive().max(1000),
});

/**
 * Opens a trade on a MASTER connection. On a PAPER connection this fills
 * immediately against the simulated quote feed; on a live platform it would
 * place a real order via that platform's adapter. Either way, the resulting
 * Trade row is what the copy engine watches to mirror onto followers.
 */
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

  const connection = await prisma.connection.findUnique({
    where: { id: parsed.data.connectionId },
  });
  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (connection.role !== "MASTER") {
    return NextResponse.json(
      { error: "Trades are opened on master accounts and copied to followers" },
      { status: 400 },
    );
  }

  try {
    const adapter = getBrokerAdapter(connection);
    const order = await adapter.placeOrder({
      symbol: parsed.data.symbol.toUpperCase(),
      side: parsed.data.side,
      volume: parsed.data.volume,
    });

    const trade = await prisma.trade.create({
      data: {
        connectionId: connection.id,
        ticketId: order.ticketId,
        symbol: parsed.data.symbol.toUpperCase(),
        side: parsed.data.side,
        volume: parsed.data.volume,
        openPrice: order.fillPrice,
        status: "OPEN",
      },
    });

    return NextResponse.json(trade, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
