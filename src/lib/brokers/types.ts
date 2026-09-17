export type OrderSide = "BUY" | "SELL";

export interface OpenPosition {
  ticketId: string;
  symbol: string;
  side: OrderSide;
  volume: number;
  openPrice: number;
}

export interface PlaceOrderInput {
  symbol: string;
  side: OrderSide;
  volume: number;
}

export interface PlaceOrderResult {
  ticketId: string;
  fillPrice: number;
}

/**
 * Every broker/platform we support (paper, MT4, MT5, cTrader) implements this
 * interface. The copy engine only ever talks to a BrokerAdapter — it never
 * knows which platform is behind a connection.
 */
export interface BrokerAdapter {
  readonly platform: string;

  listOpenPositions(): Promise<OpenPosition[]>;
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>;
  closePosition(ticketId: string): Promise<{ closePrice: number }>;
  getQuote(symbol: string): Promise<number>;
}

export class BrokerNotImplementedError extends Error {
  constructor(platform: string) {
    super(
      `${platform} live trading is not wired up yet. This adapter needs the vendor SDK ` +
        `(MetaApi/MT5 Manager API for MT4/MT5, or the cTrader Open API) plus real account ` +
        `credentials, which this environment doesn't have. Implement ${platform}Adapter in ` +
        `src/lib/brokers/${platform.toLowerCase()}.ts against this same BrokerAdapter interface ` +
        `and it will plug straight into the existing copy engine.`,
    );
    this.name = "BrokerNotImplementedError";
  }
}
