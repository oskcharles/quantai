-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'PAPER',
    "role" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "server" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "balance" REAL NOT NULL DEFAULT 10000,
    "equity" REAL NOT NULL DEFAULT 10000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopyLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masterId" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "riskMultiplier" REAL NOT NULL DEFAULT 1.0,
    "maxLotSize" REAL,
    "reverseCopy" BOOLEAN NOT NULL DEFAULT false,
    "symbolWhitelist" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopyLink_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "Connection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CopyLink_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Connection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "volume" REAL NOT NULL,
    "openPrice" REAL NOT NULL,
    "closePrice" REAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "Trade_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopiedTrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceTradeId" TEXT NOT NULL,
    "copyLinkId" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followerTicketId" TEXT,
    "volume" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "executedAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopiedTrade_sourceTradeId_fkey" FOREIGN KEY ("sourceTradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CopiedTrade_copyLinkId_fkey" FOREIGN KEY ("copyLinkId") REFERENCES "CopyLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CopiedTrade_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Connection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Connection_userId_idx" ON "Connection"("userId");

-- CreateIndex
CREATE INDEX "CopyLink_masterId_idx" ON "CopyLink"("masterId");

-- CreateIndex
CREATE INDEX "CopyLink_followerId_idx" ON "CopyLink"("followerId");

-- CreateIndex
CREATE UNIQUE INDEX "CopyLink_masterId_followerId_key" ON "CopyLink"("masterId", "followerId");

-- CreateIndex
CREATE INDEX "Trade_connectionId_idx" ON "Trade"("connectionId");

-- CreateIndex
CREATE INDEX "CopiedTrade_copyLinkId_idx" ON "CopiedTrade"("copyLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "CopiedTrade_sourceTradeId_copyLinkId_key" ON "CopiedTrade"("sourceTradeId", "copyLinkId");
