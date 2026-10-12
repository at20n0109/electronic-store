-- Additive only: the GHN consignment table plus the structured receiver
-- address codes GHN needs. No existing column is altered or dropped, so
-- `prisma migrate deploy` can run against a populated production database
-- without data loss.

-- CreateTable
CREATE TABLE IF NOT EXISTS "GhnShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ghnOrderCode" TEXT NOT NULL,
    "serviceId" INTEGER,
    "fee" INTEGER,
    "codAmount" INTEGER,
    "insuranceValue" INTEGER,
    "status" TEXT,
    "expectedDeliveryTime" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GhnShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GhnShipment_orderId_key" ON "GhnShipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GhnShipment_ghnOrderCode_key" ON "GhnShipment"("ghnOrderCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GhnShipment_status_idx" ON "GhnShipment"("status");

-- AddForeignKey
ALTER TABLE "GhnShipment" ADD CONSTRAINT "GhnShipment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "receiverProvinceId" INTEGER,
    ADD COLUMN IF NOT EXISTS "receiverDistrictId" INTEGER,
    ADD COLUMN IF NOT EXISTS "receiverWardCode" TEXT;
