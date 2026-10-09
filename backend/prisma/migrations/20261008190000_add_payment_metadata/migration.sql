-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentMetadata" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "note" TEXT,

    CONSTRAINT "PaymentMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMetadata_orderId_key" ON "PaymentMetadata"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentMetadata_paymentId_idx" ON "PaymentMetadata"("paymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentMetadata_status_idx" ON "PaymentMetadata"("status");

-- AlterEnum: add ATM_MOCK to PaymentProvider
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'ATM_MOCK';