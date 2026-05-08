import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDiary, listDiaries, softDeleteDiary } from "@/server/diaryService";
import { exportBackup, importBackup } from "@/server/backupService";
import { restoreVersion, saveDiaryVersion } from "@/server/versionService";

describe("backupService", () => {
  beforeEach(async () => {
    await prisma.diaryVersion.deleteMany();
    await prisma.diary.deleteMany();
  });

  it("exports active and archived diaries with full version history", async () => {
    const active = await createDiary({ title: "Active", content: "one" });
    await saveDiaryVersion({
      diaryId: active.id,
      title: "Active",
      content: "two",
      contentFormat: "markdown",
      saveType: "AUTO",
      baseVersionId: active.latestVersionId,
    });

    const archived = await createDiary({ title: "Archived", content: "start" });
    await restoreVersion({ diaryId: archived.id, versionId: archived.latestVersionId! });
    await softDeleteDiary(archived.id);

    const backup = await exportBackup();

    expect(backup.schemaVersion).toBe(1);
    expect(backup.diaries).toHaveLength(2);
    expect(backup.diaries[0]?.versions.length).toBe(2);
    expect(backup.diaries[1]?.deletedAt).not.toBeNull();
    expect(backup.diaries[1]?.versions.map((version) => version.saveType)).toEqual(["MANUAL", "RESTORE"]);
  });

  it("imports backup into new diary and version rows without overwriting existing data", async () => {
    const original = await createDiary({ title: "Original", content: "v1" });
    await saveDiaryVersion({
      diaryId: original.id,
      title: "Original",
      content: "v2",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: original.latestVersionId,
      message: "expand",
    });
    const latestOriginal = await prisma.diary.findUniqueOrThrow({
      where: { id: original.id },
      include: { versions: { orderBy: { versionNumber: "asc" } } },
    });

    const backup = await exportBackup();
    await createDiary({ title: "Existing", content: "stay here" });

    const summary = await importBackup(backup);
    const diaries = await prisma.diary.findMany({ include: { versions: true } });
    const importedCopies = diaries.filter((diary) => diary.title === latestOriginal.title);

    expect(summary.importedDiaries).toBe(1);
    expect(summary.importedVersions).toBe(2);
    expect(importedCopies).toHaveLength(2);

    const imported = importedCopies.find((diary) => diary.id !== latestOriginal.id);
    expect(imported).toBeDefined();
    expect(imported?.latestVersionId).not.toBe(latestOriginal.latestVersionId);
    expect(imported?.versions).toHaveLength(2);
    expect(imported?.versions.every((version) => version.diaryId === imported.id)).toBe(true);
    expect(imported?.versions.map((version) => version.versionNumber).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(imported?.versions.find((version) => version.versionNumber === 2)?.message).toBe("expand");
  });

  it("preserves archived state and version relationships when importing", async () => {
    const diary = await createDiary({ title: "Chain", content: "one" });
    const saved = await saveDiaryVersion({
      diaryId: diary.id,
      title: "Chain",
      content: "two",
      contentFormat: "markdown",
      saveType: "AUTO",
      baseVersionId: diary.latestVersionId,
    });
    await restoreVersion({ diaryId: diary.id, versionId: diary.latestVersionId! });
    await softDeleteDiary(diary.id);

    const backup = await exportBackup();
    await prisma.diaryVersion.deleteMany();
    await prisma.diary.deleteMany();

    const summary = await importBackup(backup);
    const imported = await prisma.diary.findFirstOrThrow({
      where: { title: "Chain" },
      include: { versions: { orderBy: { versionNumber: "asc" } } },
    });

    expect(summary.archivedDiaries).toBe(1);
    expect(imported.deletedAt).not.toBeNull();
    expect(imported.versions.map((version) => version.saveType)).toEqual(["MANUAL", "AUTO", "RESTORE"]);
    expect(imported.versions[1]?.baseVersionId).toBe(imported.versions[0]?.id);
    expect(imported.versions[1]?.parentVersionId).toBe(imported.versions[0]?.id);
    expect(imported.versions[2]?.restoredFromVersionId).toBe(imported.versions[0]?.id);
    expect(imported.latestVersionId).toBe(imported.versions[2]?.id);
    expect(saved.version.id).not.toBe(imported.versions[1]?.id);
  });

  it("rejects invalid backup payloads and rolls back the transaction", async () => {
    const diary = await createDiary({ title: "Broken", content: "hello" });
    const backup = await exportBackup();
    const broken = structuredClone(backup);
    broken.diaries[0]!.versions[0]!.contentHash = "bad-hash";

    await expect(importBackup(broken)).rejects.toThrow("Backup version content hash is invalid");
    await expect(listDiaries()).resolves.toMatchObject({ diaries: [{ id: diary.id }] });
    await expect(prisma.diary.count()).resolves.toBe(1);
  });
});
