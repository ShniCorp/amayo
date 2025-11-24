-- CreateTable
CREATE TABLE "public"."MusicPlaylist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaylistTrack" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "thumbnail" TEXT,
    "url" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrackLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "thumbnail" TEXT,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MusicPlaylist_userId_guildId_idx" ON "public"."MusicPlaylist"("userId", "guildId");

-- CreateIndex
CREATE INDEX "MusicPlaylist_userId_isDefault_idx" ON "public"."MusicPlaylist"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "MusicPlaylist_userId_guildId_name_key" ON "public"."MusicPlaylist"("userId", "guildId", "name");

-- CreateIndex
CREATE INDEX "PlaylistTrack_playlistId_idx" ON "public"."PlaylistTrack"("playlistId");

-- CreateIndex
CREATE INDEX "PlaylistTrack_trackId_idx" ON "public"."PlaylistTrack"("trackId");

-- CreateIndex
CREATE INDEX "TrackLike_userId_guildId_idx" ON "public"."TrackLike"("userId", "guildId");

-- CreateIndex
CREATE INDEX "TrackLike_trackId_idx" ON "public"."TrackLike"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackLike_userId_guildId_trackId_key" ON "public"."TrackLike"("userId", "guildId", "trackId");

-- AddForeignKey
ALTER TABLE "public"."PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "public"."MusicPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
