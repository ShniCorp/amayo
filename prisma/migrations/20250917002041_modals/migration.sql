/*
  Warnings:

  - Added the required column `name` to the `EmbedConfig` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmbedConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "EmbedConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EmbedConfig" ("authorIconURL", "authorName", "authorURL", "color", "description", "fields", "footerIconURL", "footerText", "guildId", "id", "imageURL", "thumbnailURL", "title", "url") SELECT "authorIconURL", "authorName", "authorURL", "color", "description", "fields", "footerIconURL", "footerText", "guildId", "id", "imageURL", "thumbnailURL", "title", "url" FROM "EmbedConfig";
DROP TABLE "EmbedConfig";
ALTER TABLE "new_EmbedConfig" RENAME TO "EmbedConfig";
CREATE UNIQUE INDEX "EmbedConfig_guildId_name_key" ON "EmbedConfig"("guildId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
