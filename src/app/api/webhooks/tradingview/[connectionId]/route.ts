import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getBrokerAdapter } from "@/lib/brokers";
import { TRADE_SIDES } from "@/lib/constants";

const upperSide = z.string().transform((s) => s.toUpperCase()).pipe(z.enum(TRADE_SIDES));

const openSchema = z.object({
  action: z.literal("OPEN").optional().default("OPEN"),
  symbol: z.string().min(1).max(20),
  side: upperSide,
  volume: z.number().positive().max(1000).default(1),
});

const closeSchema = z.object({
  action: z.literal("CLOSE"),
  symbol: z.string().min(1).max(20).optional(),
});

const schema = z.union([openSchema, closeSchema]);

/**
 * Public endpoint for TradingView (or any external signal source) to open or
 * close a trade on a MASTER connection by webhook, instead of clicking
 * buttons in the dashboard. Authenticated by a per-connection secret in the
 * query string — TradingView alerts can't send custom headers on most
 * plans, so the secret travels in the URL instead:
 *
 *   POST /api/webhooks/tradingview/<connectionId>?secret=<webhookSecret>
 *
 *   Open:  {"symbol": "EURUSD", "side": "BUY", "volume": 1}
 *   Close: {"action": "CLOSE", "symbol": "EURUSD"}   (symbol optional —
 *          closes the most recent open trade on this connection, filtered
 *          to that symbol if given)
 *
 * `side` accepts any case ("buy"/"BUY") since TradingView's own
 * {{strategy.order.action}} placeholder emits lowercase.
 *
 * The resulting Trade is identical to one opened/closed manually — the
 * copy engine picks it up on its next tick the same way either way.
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
      { error: "Webhooks can only trade on master accounts" },
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

    if (parsed.data.action === "CLOSE") {
      const trade = await prisma.trade.findFirst({
        where: {
          connectionId: connection.id,
          status: "OPEN",
          ...(parsed.data.symbol ? { symbol: parsed.data.symbol.toUpperCase() } : {}),
        },
        orderBy: { openedAt: "desc" },
      });
      if (!trade) {
        return NextResponse.json(
          { error: "No matching open trade to close" },
          { status: 400 },
        );
      }

      const { closePrice } = await adapter.closePosition(trade.ticketId);
      const updated = await prisma.trade.update({
        where: { id: trade.id },
        data: { status: "CLOSED", closePrice, closedAt: new Date() },
      });
      return NextResponse.json(updated);
    }

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
