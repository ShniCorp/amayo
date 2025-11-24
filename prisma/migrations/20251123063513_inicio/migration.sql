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

-- CreateTable
CREATE TABLE "public"."GameArea" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "guildId" TEXT,
    "config" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameAreaLevel" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "requirements" JSONB,
    "rewards" JSONB,
    "mobs" JSONB,
    "metadata" JSONB,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAreaLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mob" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "guildId" TEXT,
    "stats" JSONB,
    "drops" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MinigameRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "toolItemId" TEXT,
    "success" BOOLEAN NOT NULL,
    "result" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinigameRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "highestLevel" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "stats" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerEquipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "weaponItemId" TEXT,
    "armorItemId" TEXT,
    "capeItemId" TEXT,
    "accessories" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActionCooldown" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "ActionCooldown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SmeltJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "outputItemId" TEXT NOT NULL,
    "outputQty" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,

    CONSTRAINT "SmeltJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledMobAttack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "mobId" TEXT NOT NULL,
    "scheduleAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "metadata" JSONB,

    CONSTRAINT "ScheduledMobAttack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Achievement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "rewards" JSONB,
    "guildId" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3),
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Quest" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "guildId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "repeatable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."QuestProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "minesCompleted" INTEGER NOT NULL DEFAULT 0,
    "fishingCompleted" INTEGER NOT NULL DEFAULT 0,
    "fightsCompleted" INTEGER NOT NULL DEFAULT 0,
    "farmsCompleted" INTEGER NOT NULL DEFAULT 0,
    "mobsDefeated" INTEGER NOT NULL DEFAULT 0,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "damageTaken" INTEGER NOT NULL DEFAULT 0,
    "timesDefeated" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsEarned" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsSpent" INTEGER NOT NULL DEFAULT 0,
    "itemsCrafted" INTEGER NOT NULL DEFAULT 0,
    "itemsSmelted" INTEGER NOT NULL DEFAULT 0,
    "itemsPurchased" INTEGER NOT NULL DEFAULT 0,
    "chestsOpened" INTEGER NOT NULL DEFAULT 0,
    "itemsConsumed" INTEGER NOT NULL DEFAULT 0,
    "itemsEquipped" INTEGER NOT NULL DEFAULT 0,
    "highestDamageDealt" INTEGER NOT NULL DEFAULT 0,
    "longestWinStreak" INTEGER NOT NULL DEFAULT 0,
    "currentWinStreak" INTEGER NOT NULL DEFAULT 0,
    "mostCoinsAtOnce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerStatusEffect" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStatusEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalDaysActive" INTEGER NOT NULL DEFAULT 0,
    "rewardsClaimed" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeathLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "areaId" TEXT,
    "areaKey" TEXT,
    "level" INTEGER,
    "goldLost" INTEGER NOT NULL DEFAULT 0,
    "percentApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoDefeatNoWeapon" BOOLEAN NOT NULL DEFAULT false,
    "fatigueMagnitude" DOUBLE PRECISION,
    "fatigueMinutes" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeathLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disabled',
    "target" TEXT NOT NULL DEFAULT 'global',
    "rolloutStrategy" TEXT,
    "rolloutConfig" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ListeningHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'youtube',
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "listenedMs" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "skipReason" TEXT,

    CONSTRAINT "ListeningHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserMusicPreferences" (
    "userId" TEXT NOT NULL,
    "favoriteArtists" JSONB NOT NULL DEFAULT '[]',
    "skipPatterns" JSONB NOT NULL DEFAULT '{}',
    "recentTrends" JSONB NOT NULL DEFAULT '[]',
    "autoplayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "totalSkips" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMusicPreferences_pkey" PRIMARY KEY ("userId")
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

-- CreateIndex
CREATE INDEX "EconomyWallet_guildId_idx" ON "public"."EconomyWallet"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomyWallet_userId_guildId_key" ON "public"."EconomyWallet"("userId", "guildId");

-- CreateIndex
CREATE INDEX "ShopPurchase_offerId_idx" ON "public"."ShopPurchase"("offerId");

-- CreateIndex
CREATE INDEX "ShopPurchase_userId_guildId_idx" ON "public"."ShopPurchase"("userId", "guildId");

-- CreateIndex
CREATE INDEX "GameArea_guildId_idx" ON "public"."GameArea"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GameArea_guildId_key_key" ON "public"."GameArea"("guildId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GameAreaLevel_areaId_level_key" ON "public"."GameAreaLevel"("areaId", "level");

-- CreateIndex
CREATE INDEX "Mob_guildId_idx" ON "public"."Mob"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Mob_guildId_key_key" ON "public"."Mob"("guildId", "key");

-- CreateIndex
CREATE INDEX "MinigameRun_userId_guildId_idx" ON "public"."MinigameRun"("userId", "guildId");

-- CreateIndex
CREATE INDEX "MinigameRun_areaId_idx" ON "public"."MinigameRun"("areaId");

-- CreateIndex
CREATE INDEX "MinigameRun_startedAt_idx" ON "public"."MinigameRun"("startedAt");

-- CreateIndex
CREATE INDEX "PlayerProgress_userId_guildId_idx" ON "public"."PlayerProgress"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProgress_userId_guildId_areaId_key" ON "public"."PlayerProgress"("userId", "guildId", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerState_userId_guildId_key" ON "public"."PlayerState"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerEquipment_userId_guildId_key" ON "public"."PlayerEquipment"("userId", "guildId");

-- CreateIndex
CREATE INDEX "ActionCooldown_until_idx" ON "public"."ActionCooldown"("until");

-- CreateIndex
CREATE UNIQUE INDEX "ActionCooldown_userId_guildId_key_key" ON "public"."ActionCooldown"("userId", "guildId", "key");

-- CreateIndex
CREATE INDEX "SmeltJob_userId_guildId_idx" ON "public"."SmeltJob"("userId", "guildId");

-- CreateIndex
CREATE INDEX "SmeltJob_readyAt_idx" ON "public"."SmeltJob"("readyAt");

-- CreateIndex
CREATE INDEX "ScheduledMobAttack_scheduleAt_idx" ON "public"."ScheduledMobAttack"("scheduleAt");

-- CreateIndex
CREATE INDEX "ScheduledMobAttack_userId_guildId_idx" ON "public"."ScheduledMobAttack"("userId", "guildId");

-- CreateIndex
CREATE INDEX "Achievement_guildId_idx" ON "public"."Achievement"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_guildId_key_key" ON "public"."Achievement"("guildId", "key");

-- CreateIndex
CREATE INDEX "PlayerAchievement_userId_guildId_idx" ON "public"."PlayerAchievement"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_userId_guildId_achievementId_key" ON "public"."PlayerAchievement"("userId", "guildId", "achievementId");

-- CreateIndex
CREATE INDEX "Quest_guildId_idx" ON "public"."Quest"("guildId");

-- CreateIndex
CREATE INDEX "Quest_type_idx" ON "public"."Quest"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_guildId_key_key" ON "public"."Quest"("guildId", "key");

-- CreateIndex
CREATE INDEX "QuestProgress_userId_guildId_idx" ON "public"."QuestProgress"("userId", "guildId");

-- CreateIndex
CREATE INDEX "QuestProgress_questId_idx" ON "public"."QuestProgress"("questId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestProgress_userId_guildId_questId_expiresAt_key" ON "public"."QuestProgress"("userId", "guildId", "questId", "expiresAt");

-- CreateIndex
CREATE INDEX "PlayerStats_userId_guildId_idx" ON "public"."PlayerStats"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStats_userId_guildId_key" ON "public"."PlayerStats"("userId", "guildId");

-- CreateIndex
CREATE INDEX "PlayerStatusEffect_userId_guildId_idx" ON "public"."PlayerStatusEffect"("userId", "guildId");

-- CreateIndex
CREATE INDEX "PlayerStatusEffect_guildId_idx" ON "public"."PlayerStatusEffect"("guildId");

-- CreateIndex
CREATE INDEX "PlayerStatusEffect_expiresAt_idx" ON "public"."PlayerStatusEffect"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStatusEffect_userId_guildId_type_key" ON "public"."PlayerStatusEffect"("userId", "guildId", "type");

-- CreateIndex
CREATE INDEX "PlayerStreak_userId_guildId_idx" ON "public"."PlayerStreak"("userId", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStreak_userId_guildId_key" ON "public"."PlayerStreak"("userId", "guildId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_guildId_idx" ON "public"."AuditLog"("userId", "guildId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DeathLog_userId_guildId_idx" ON "public"."DeathLog"("userId", "guildId");

-- CreateIndex
CREATE INDEX "DeathLog_createdAt_idx" ON "public"."DeathLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "public"."FeatureFlag"("name");

-- CreateIndex
CREATE INDEX "FeatureFlag_status_idx" ON "public"."FeatureFlag"("status");

-- CreateIndex
CREATE INDEX "FeatureFlag_target_idx" ON "public"."FeatureFlag"("target");

-- CreateIndex
CREATE INDEX "ListeningHistory_userId_playedAt_idx" ON "public"."ListeningHistory"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "ListeningHistory_guildId_playedAt_idx" ON "public"."ListeningHistory"("guildId", "playedAt");

-- CreateIndex
CREATE INDEX "ListeningHistory_userId_score_idx" ON "public"."ListeningHistory"("userId", "score");

-- CreateIndex
CREATE INDEX "UserMusicPreferences_lastUpdated_idx" ON "public"."UserMusicPreferences"("lastUpdated");

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

-- AddForeignKey
ALTER TABLE "public"."GameArea" ADD CONSTRAINT "GameArea_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameAreaLevel" ADD CONSTRAINT "GameAreaLevel_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."GameArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mob" ADD CONSTRAINT "Mob_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MinigameRun" ADD CONSTRAINT "MinigameRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MinigameRun" ADD CONSTRAINT "MinigameRun_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MinigameRun" ADD CONSTRAINT "MinigameRun_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."GameArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerProgress" ADD CONSTRAINT "PlayerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerProgress" ADD CONSTRAINT "PlayerProgress_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerProgress" ADD CONSTRAINT "PlayerProgress_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."GameArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerState" ADD CONSTRAINT "PlayerState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerState" ADD CONSTRAINT "PlayerState_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerEquipment" ADD CONSTRAINT "PlayerEquipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerEquipment" ADD CONSTRAINT "PlayerEquipment_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActionCooldown" ADD CONSTRAINT "ActionCooldown_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActionCooldown" ADD CONSTRAINT "ActionCooldown_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmeltJob" ADD CONSTRAINT "SmeltJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmeltJob" ADD CONSTRAINT "SmeltJob_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmeltJob" ADD CONSTRAINT "SmeltJob_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "public"."EconomyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledMobAttack" ADD CONSTRAINT "ScheduledMobAttack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledMobAttack" ADD CONSTRAINT "ScheduledMobAttack_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledMobAttack" ADD CONSTRAINT "ScheduledMobAttack_mobId_fkey" FOREIGN KEY ("mobId") REFERENCES "public"."Mob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Achievement" ADD CONSTRAINT "Achievement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerAchievement" ADD CONSTRAINT "PlayerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "public"."Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quest" ADD CONSTRAINT "Quest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestProgress" ADD CONSTRAINT "QuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestProgress" ADD CONSTRAINT "QuestProgress_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuestProgress" ADD CONSTRAINT "QuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "public"."Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStats" ADD CONSTRAINT "PlayerStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStatusEffect" ADD CONSTRAINT "PlayerStatusEffect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStatusEffect" ADD CONSTRAINT "PlayerStatusEffect_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStreak" ADD CONSTRAINT "PlayerStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerStreak" ADD CONSTRAINT "PlayerStreak_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeathLog" ADD CONSTRAINT "DeathLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeathLog" ADD CONSTRAINT "DeathLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeathLog" ADD CONSTRAINT "DeathLog_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "public"."GameArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
