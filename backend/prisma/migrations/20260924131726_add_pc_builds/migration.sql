-- CreateTable
CREATE TABLE "PcBuild" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT,
    "budget" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcBuildItem" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PcBuildItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PcBuild_slug_key" ON "PcBuild"("slug");

-- CreateIndex
CREATE INDEX "PcBuild_slug_idx" ON "PcBuild"("slug");

-- CreateIndex
CREATE INDEX "PcBuild_tier_idx" ON "PcBuild"("tier");

-- CreateIndex
CREATE INDEX "PcBuildItem_productId_idx" ON "PcBuildItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PcBuildItem_buildId_slot_key" ON "PcBuildItem"("buildId", "slot");

-- AddForeignKey
ALTER TABLE "PcBuildItem" ADD CONSTRAINT "PcBuildItem_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "PcBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcBuildItem" ADD CONSTRAINT "PcBuildItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
