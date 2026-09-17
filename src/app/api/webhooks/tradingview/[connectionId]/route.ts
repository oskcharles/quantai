import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getBrokerAdapter } from "@/lib/brokers";
import { TRADE_SIDES } from "@/lib/constants";

const schema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.enum(TRADE_SIDES),
  volume: z.number().positive().max(1000).default(1),
});

/**
 * Public endpoint for TradingView (or any external signal source) to open a
 * trade on a MASTER connection by webhook, instead of clicking "Open trade"
 * in the dashboard. Authenticated by a per-connection secret in the query
 * string — TradingView alerts can't send custom headers on most plans, so
 * the secret travels in the URL instead:
 *
 *   POST /api/webhooks/tradingview/<connectionId>?secret=<webhookSecret>
 *   body: {"symbol": "EURUSD", "side": "BUY", "volume": 1}
 *
 * The resulting Trade is identical to one opened manually — the copy engine
 * picks it up on its next tick the same way either way.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await params;
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret) {
    return NextResponse.json({ error: "Missing secret" }, { status: 401 });
  }

  const prisma = await getDb();
  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection || !connection.webhookSecret || connection.webhookSecret !== secret) {
    return NextResponse.json({ error: "Invalid connection or secret" }, { status: 401 });
  }
  if (connection.role !== "MASTER") {
    return NextResponse.json(
      { error: "Webhooks can only open trades on master accounts" },
      { status: 400 },
    );
  }
  if (!connection.active) {
    return NextResponse.json({ error: "Connection is inactive" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  try {
    const adapter = getBrokerAdapter(prisma, connection);
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
