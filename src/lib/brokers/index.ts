import { BrokerAdapter, BrokerNotImplementedError } from "./types";
import { PaperBrokerAdapter } from "./paper";

export * from "./types";

/**
 * Factory: given a Connection row, return the adapter that knows how to talk
 * to that platform. Add a case + a new file under src/lib/brokers/ to support
 * a real broker (MT4Adapter, MT5Adapter, CTraderAdapter).
 */
export function getBrokerAdapter(connection: {
  id: string;
  platform: string;
}): BrokerAdapter {
  switch (connection.platform) {
    case "PAPER":
      return new PaperBrokerAdapter(connection.id);
    case "MT4":
    case "MT5":
    case "CTRADER":
      throw new BrokerNotImplementedError(connection.platform);
    default:
      throw new Error(`Unknown broker platform: ${connection.platform}`);
  }
}
