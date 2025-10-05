-- CreateTable
CREATE TABLE "public"."EconomyItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "icon" TEXT,
    "stackable" BOOLEAN NOT NULL DEFAULT true,
    "maxPerInventory" INTEGER,
    "guildId" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "usableFrom" TIMESTAMP(3),
    "usableTo" TIMESTAMP(3),
    "tags" TEXT[],
    "props" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "state" JSONB,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemRecipe" (
    "id" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "productQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopOffer" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "price" JSONB NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "perUserLimit" INTEGER,
    "stock" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ItemMutation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effects" JSONB NOT NULL,
    "metadata" JSONB,
    "guildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryItemMutation" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "mutationId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,

    CONSTRAINT "InventoryItemMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyItem_guildId_idx" ON "public"."EconomyItem"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomyItem_guildId_key_key" ON "public"."EconomyItem"("guildId", "key");

-- CreateIndex
CREATE INDEX "InventoryEntry_userId_guildId_idx" ON "public"."InventoryEntry"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEntry_userId_guildId_itemId_key" ON "public"."InventoryEntry"("userId", "guildId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemRecipe_productItemId_key" ON "public"."ItemRecipe"("productItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeIngredient_recipeId_itemId_key" ON "public"."RecipeIngredient"("recipeId", "itemId");

-- CreateIndex
CREATE INDEX "ShopOffer_guildId_idx" ON "public"."ShopOffer"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOffer_guildId_itemId_startAt_endAt_key" ON "public"."ShopOffer"("guildId", "itemId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMutation_guildId_key_key" ON "public"."ItemMutation"("guildId", "key");

-- CreateIndex
CREATE INDEX "InventoryItemMutation_inventoryId_idx" ON "public"."InventoryItemMutation"("inventoryId");

-- AddForeignKey
ALTER TABLE "public"."EconomyItem" ADD CONSTRAINT "EconomyItem_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryEntry" ADD CONSTRAINT "InventoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryEntry" ADD CONSTRAINT "InventoryEntry_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryEntry" ADD CONSTRAINT "InventoryEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."EconomyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemRecipe" ADD CONSTRAINT "ItemRecipe_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "public"."EconomyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."ItemRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."EconomyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopOffer" ADD CONSTRAINT "ShopOffer_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopOffer" ADD CONSTRAINT "ShopOffer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."EconomyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ItemMutation" ADD CONSTRAINT "ItemMutation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItemMutation" ADD CONSTRAINT "InventoryItemMutation_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "public"."InventoryEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItemMutation" ADD CONSTRAINT "InventoryItemMutation_mutationId_fkey" FOREIGN KEY ("mutationId") REFERENCES "public"."ItemMutation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
