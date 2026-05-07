-- CreateTable
CREATE TABLE "Diary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentFormat" TEXT NOT NULL DEFAULT 'markdown',
    "latestVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Diary_latestVersionId_fkey" FOREIGN KEY ("latestVersionId") REFERENCES "DiaryVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiaryVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "diaryId" TEXT NOT NULL,
    "parentVersionId" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "saveType" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "contentFormat" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "message" TEXT,
    "baseVersionId" TEXT,
    "restoredFromVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryVersion_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "Diary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiaryVersion_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "DiaryVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Diary_updatedAt_idx" ON "Diary"("updatedAt");

-- CreateIndex
CREATE INDEX "Diary_deletedAt_idx" ON "Diary"("deletedAt");

-- CreateIndex
CREATE INDEX "DiaryVersion_diaryId_createdAt_idx" ON "DiaryVersion"("diaryId", "createdAt");

-- CreateIndex
CREATE INDEX "DiaryVersion_diaryId_contentHash_idx" ON "DiaryVersion"("diaryId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryVersion_diaryId_versionNumber_key" ON "DiaryVersion"("diaryId", "versionNumber");
