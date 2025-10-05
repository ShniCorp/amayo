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
