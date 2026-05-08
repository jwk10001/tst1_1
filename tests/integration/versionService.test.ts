import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDiary } from "@/server/diaryService";
import { getVersionDiff, listVersions, restoreVersion, saveDiaryVersion } from "@/server/versionService";

beforeEach(async () => {
  await prisma.diaryVersion.deleteMany();
  await prisma.diary.deleteMany();
});

describe("versionService", () => {
  it("deduplicates unchanged manual and auto saves", async () => {
    const diary = await createDiary({ title: "Today", content: "hello" });

    const manual = await saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "hello",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
    });
    const auto = await saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "hello",
      contentFormat: "markdown",
      saveType: "AUTO",
      baseVersionId: diary.latestVersionId,
    });

    expect(manual.changed).toBe(false);
    expect(auto.changed).toBe(false);
    await expect(prisma.diaryVersion.count({ where: { diaryId: diary.id } })).resolves.toBe(1);
  });

  it("creates incrementing append-only versions for changed content", async () => {
    const diary = await createDiary({ title: "Today", content: "hello" });
    const saved = await saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "hello again",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
      message: "Expand entry",
    });

    const versions = await listVersions(diary.id);

    expect(saved.changed).toBe(true);
    expect(saved.version.versionNumber).toBe(2);
    expect(versions.map((version) => version.versionNumber)).toEqual([2, 1]);
    expect(versions[0]?.message).toBe("Expand entry");
  });

  it("restore always creates a RESTORE version even when content matches latest", async () => {
    const diary = await createDiary({ title: "Today", content: "hello" });
    const restored = await restoreVersion({ diaryId: diary.id, versionId: diary.latestVersionId! });
    const versions = await listVersions(diary.id);

    expect(restored.changed).toBe(true);
    expect(restored.version.saveType).toBe("RESTORE");
    expect(restored.version.restoredFromVersionId).toBe(diary.latestVersionId);
    expect(versions.map((version) => version.saveType)).toEqual(["RESTORE", "MANUAL"]);
  });

  it("filters versions by save type", async () => {
    const diary = await createDiary({ title: "Today", content: "one" });
    await saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "two",
      contentFormat: "markdown",
      saveType: "AUTO",
      baseVersionId: diary.latestVersionId,
    });

    const autoVersions = await listVersions(diary.id, { saveType: "AUTO" });

    expect(autoVersions).toHaveLength(1);
    expect(autoVersions[0]?.saveType).toBe("AUTO");
  });

  it("reports stale base versions without blocking append-only saves", async () => {
    const diary = await createDiary({ title: "Today", content: "one" });
    await saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "two",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
    });

    const staleSave = await saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "three",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
    });

    expect(staleSave.changed).toBe(true);
    expect(staleSave.baseVersionStale).toBe(true);
    expect(staleSave.version.versionNumber).toBe(3);
  });

  it("diff rejects versions from another diary", async () => {
    const first = await createDiary({ title: "First", content: "one" });
    const second = await createDiary({ title: "Second", content: "two" });

    await expect(getVersionDiff(first.id, first.latestVersionId!, second.latestVersionId!)).rejects.toThrow("Version not found");
  });
});
