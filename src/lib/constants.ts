export const BROKER_PLATFORMS = ["PAPER", "MT4", "MT5", "CTRADER"] as const;
export type BrokerPlatform = (typeof BROKER_PLATFORMS)[number];

export const CONNECTION_ROLES = ["MASTER", "FOLLOWER"] as const;
export type ConnectionRole = (typeof CONNECTION_ROLES)[number];

export const TRADE_SIDES = ["BUY", "SELL"] as const;
export type TradeSide = (typeof TRADE_SIDES)[number];

export const TRADE_STATUSES = ["OPEN", "CLOSED"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const COPY_STATUSES = ["PENDING", "EXECUTED", "FAILED", "CLOSED"] as const;
export type CopyStatus = (typeof COPY_STATUSES)[number];
