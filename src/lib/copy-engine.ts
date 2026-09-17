import type { PrismaClient } from "@prisma/client";
import { getBrokerAdapter } from "@/lib/brokers";
import type { OrderSide } from "@/lib/brokers/types";

function opposite(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

function scaledVolume(
  sourceVolume: number,
  multiplier: number,
  maxLotSize: number | null,
) {
  const scaled = Number((sourceVolume * multiplier).toFixed(2));
  if (maxLotSize && scaled > maxLotSize) return maxLotSize;
  return Math.max(scaled, 0.01);
}

function symbolAllowed(symbol: string, whitelist: string | null) {
  if (!whitelist) return true;
  const list = whitelist
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(symbol.toUpperCase());
}

/**
 * One "tick" of the copy engine:
 *  1. For every active CopyLink, look at open trades on the master that
 *     haven't been copied yet, and open the scaled equivalent on the
 *     follower.
 *  2. Close any copied trade whose source trade has since closed.
 *
 * In production this would be driven by a broker's live trade stream
 * (webhook or websocket) instead of being polled on demand, but the logic
 * here is identical either way — only the trigger changes.
 */
export async function runCopyEngineTick(db: PrismaClient, userId: string) {
  const links = await db.copyLink.findMany({
    where: { active: true, master: { userId } },
    include: { master: true, follower: true },
  });

  const results: { copyLinkId: string; action: string; detail: string }[] =
    [];

  for (const link of links) {
    const openMasterTrades = await db.trade.findMany({
      where: { connectionId: link.masterId, status: "OPEN" },
    });

    for (const trade of openMasterTrades) {
      if (!symbolAllowed(trade.symbol, link.symbolWhitelist)) continue;

      const existing = await db.copiedTrade.findUnique({
        where: {
          sourceTradeId_copyLinkId: {
            sourceTradeId: trade.id,
            copyLinkId: link.id,
          },
        },
      });
      if (existing) continue;

      const volume = scaledVolume(
        trade.volume,
        link.riskMultiplier,
        link.maxLotSize,
      );
      const side = link.reverseCopy
        ? opposite(trade.side as OrderSide)
        : (trade.side as OrderSide);

      try {
        const adapter = getBrokerAdapter(db, link.follower);
        const order = await adapter.placeOrder({
          symbol: trade.symbol,
          side,
          volume,
        });

        await db.$transaction([
          db.copiedTrade.create({
            data: {
              sourceTradeId: trade.id,
              copyLinkId: link.id,
              followerId: link.followerId,
              followerTicketId: order.ticketId,
              volume,
              status: "EXECUTED",
              executedAt: new Date(),
            },
          }),
          db.trade.create({
            data: {
              connectionId: link.followerId,
              ticketId: order.ticketId,
              symbol: trade.symbol,
              side,
              volume,
              openPrice: order.fillPrice,
              status: "OPEN",
            },
          }),
        ]);

        results.push({
          copyLinkId: link.id,
          action: "OPENED",
          detail: `${side} ${volume} ${trade.symbol} on ${link.follower.label}`,
        });
      } catch (err) {
        await db.copiedTrade.create({
          data: {
            sourceTradeId: trade.id,
            copyLinkId: link.id,
            followerId: link.followerId,
            volume,
            status: "FAILED",
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        });
        results.push({
          copyLinkId: link.id,
          action: "FAILED",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Mirror closes: if a source trade closed, close the copied trade too.
    const openCopies = await db.copiedTrade.findMany({
      where: { copyLinkId: link.id, status: "EXECUTED" },
      include: { sourceTrade: true },
    });

    for (const copy of openCopies) {
      if (copy.sourceTrade.status !== "CLOSED") continue;

      const followerTrade = await db.trade.findFirst({
        where: { ticketId: copy.followerTicketId ?? "" },
      });
      if (!followerTrade || followerTrade.status === "CLOSED") continue;

      const adapter = getBrokerAdapter(db, link.follower);
      const { closePrice } = await adapter.closePosition(
        followerTrade.ticketId,
      );

      await db.$transaction([
        db.trade.update({
          where: { id: followerTrade.id },
          data: { status: "CLOSED", closePrice, closedAt: new Date() },
        }),
        db.copiedTrade.update({
          where: { id: copy.id },
          data: { status: "CLOSED", closedAt: new Date() },
        }),
      ]);

      results.push({
        copyLinkId: link.id,
        action: "CLOSED",
        detail: `Closed ${followerTrade.symbol} on ${link.follower.label}`,
      });
    }
  }

  return results;
}
