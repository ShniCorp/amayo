-- CreateTable
CREATE TABLE "public"."Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '!',

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartnershipStats" (
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "weeklyPoints" INTEGER NOT NULL DEFAULT 0,
    "monthlyPoints" INTEGER NOT NULL DEFAULT 0,
    "lastWeeklyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMonthlyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "PartnershipStats_pkey" PRIMARY KEY ("userId","guildId")
);

-- CreateTable
CREATE TABLE "public"."Alliance" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Alliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AllianceChannel" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "blockConfigName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "AllianceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PointHistory" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "PointHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmbedConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "title" TEXT,
    "url" TEXT,
    "authorName" TEXT,
    "authorIconURL" TEXT,
    "authorURL" TEXT,
    "description" TEXT,
    "thumbnailURL" TEXT,
    "imageURL" TEXT,
    "footerText" TEXT,
    "footerIconURL" TEXT,
    "fields" TEXT DEFAULT '[]',
    "guildId" TEXT NOT NULL,

    CONSTRAINT "EmbedConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlockV2Config" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "BlockV2Config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_messageId_key" ON "public"."Alliance"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceChannel_channelId_key" ON "public"."AllianceChannel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "AllianceChannel_guildId_channelId_key" ON "public"."AllianceChannel"("guildId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "EmbedConfig_guildId_name_key" ON "public"."EmbedConfig"("guildId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BlockV2Config_guildId_name_key" ON "public"."BlockV2Config"("guildId", "name");

-- AddForeignKey
ALTER TABLE "public"."PartnershipStats" ADD CONSTRAINT "PartnershipStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartnershipStats" ADD CONSTRAINT "PartnershipStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alliance" ADD CONSTRAINT "Alliance_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alliance" ADD CONSTRAINT "Alliance_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllianceChannel" ADD CONSTRAINT "AllianceChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointHistory" ADD CONSTRAINT "PointHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointHistory" ADD CONSTRAINT "PointHistory_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointHistory" ADD CONSTRAINT "PointHistory_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."AllianceChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbedConfig" ADD CONSTRAINT "EmbedConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockV2Config" ADD CONSTRAINT "BlockV2Config_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "public"."Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
