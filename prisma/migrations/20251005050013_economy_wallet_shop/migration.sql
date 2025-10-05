-- CreateTable
CREATE TABLE "public"."EconomyWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomyWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopPurchase" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyWallet_guildId_idx" ON "public"."EconomyWallet"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomyWallet_userId_guildId_key" ON "public"."EconomyWallet"("userId", "guildId");

-- CreateIndex
CREATE INDEX "ShopPurchase_offerId_idx" ON "public"."ShopPurchase"("offerId");

-- CreateIndex
CREATE INDEX "ShopPurchase_userId_guildId_idx" ON "public"."ShopPurchase"("userId", "guildId");

-- AddForeignKey
ALTER TABLE "public"."EconomyWallet" ADD CONSTRAINT "EconomyWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EconomyWallet" ADD CONSTRAINT "EconomyWallet_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopPurchase" ADD CONSTRAINT "ShopPurchase_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."ShopOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopPurchase" ADD CONSTRAINT "ShopPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopPurchase" ADD CONSTRAINT "ShopPurchase_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
