-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "PartnershipStats" (
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "weeklyPoints" INTEGER NOT NULL DEFAULT 0,
    "monthlyPoints" INTEGER NOT NULL DEFAULT 0,
    "lastWeeklyReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMonthlyReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "guildId"),
    CONSTRAINT "PartnershipStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartnershipStats_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alliance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    CONSTRAINT "Alliance_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alliance_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmbedConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "EmbedConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Alliance_messageId_key" ON "Alliance"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "EmbedConfig_guildId_key" ON "EmbedConfig"("guildId");
