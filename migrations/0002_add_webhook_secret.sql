-- AlterTable
ALTER TABLE "Connection" ADD COLUMN "webhookSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Connection_webhookSecret_key" ON "Connection"("webhookSecret");
