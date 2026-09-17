import type { PrismaClient } from "@prisma/client";
import {
  BrokerAdapter,
  OpenPosition,
  OrderSide,
  PlaceOrderInput,
  PlaceOrderResult,
} from "./types";

const SEED_PRICES: Record<string, number> = {
  EURUSD: 1.0842,
  GBPUSD: 1.2695,
  USDJPY: 149.32,
  XAUUSD: 2385.4,
  BTCUSD: 62150,
  US30: 39250,
};

function jitter(base: number) {
  const pct = (Math.random() - 0.5) * 0.002; // +/-0.1%
  return Number((base * (1 + pct)).toFixed(4));
}

/**
 * Simulated broker used for demos, tests, and every account until a real
 * platform adapter (MT4/MT5/cTrader) is connected. Trades placed here are
 * persisted as real Trade rows so the copy engine, dashboard, and history
 * behave exactly as they would against a live broker.
 */
export class PaperBrokerAdapter implements BrokerAdapter {
  readonly platform = "PAPER";

  constructor(private db: PrismaClient, private connectionId: string) {}

  async getQuote(symbol: string): Promise<number> {
    const base = SEED_PRICES[symbol] ?? 100;
    return jitter(base);
  }

  async listOpenPositions(): Promise<OpenPosition[]> {
    const trades = await this.db.trade.findMany({
      where: { connectionId: this.connectionId, status: "OPEN" },
    });
    return trades.map((t) => ({
      ticketId: t.ticketId,
      symbol: t.symbol,
      side: t.side as OrderSide,
      volume: t.volume,
      openPrice: t.openPrice,
    }));
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const fillPrice = await this.getQuote(input.symbol);
    const ticketId = `P-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return { ticketId, fillPrice };
  }

  async closePosition(ticketId: string): Promise<{ closePrice: number }> {
    const trade = await this.db.trade.findFirst({ where: { ticketId } });
    const closePrice = await this.getQuote(trade?.symbol ?? "EURUSD");
    return { closePrice };
  }
}
