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
