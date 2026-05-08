import { beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createMobileDiaryService } from "@/mobile/diaryService";
import { normalizeDiaryContent } from "@/lib/versioning/normalizeDiaryContent";
import type { MobileDiary, MobileDiaryRepository, MobileDiaryVersion } from "@/mobile/types";

class MemoryDiaryRepository implements MobileDiaryRepository {
  diaries = new Map<string, MobileDiary>();
  versions = new Map<string, MobileDiaryVersion>();

  async createDiary(input: { title: string; content: string; contentFormat: "markdown" }) {
    const now = new Date().toISOString();
    const diary: MobileDiary = {
      id: createId(),
      title: input.title,
      content: input.content,
      contentFormat: input.contentFormat,
      latestVersionId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.diaries.set(diary.id, diary);

    return diary;
  }

  async listDiaries() {
    return [...this.diaries.values()]
      .filter((diary) => !diary.deletedAt)
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  }

  async getDiary(diaryId: string) {
    const diary = this.diaries.get(diaryId);
    return diary && !diary.deletedAt ? diary : null;
  }

  async getVersion(diaryId: string, versionId: string) {
    const version = this.versions.get(versionId);
    return version?.diaryId === diaryId ? version : null;
  }

  async listVersions(diaryId: string, filters: { saveType?: "MANUAL" | "AUTO" | "RESTORE" } = {}) {
    return [...this.versions.values()]
      .filter((version) => version.diaryId === diaryId)
      .filter((version) => !filters.saveType || version.saveType === filters.saveType)
      .sort((first, second) => second.versionNumber - first.versionNumber);
  }

  async insertVersion(version: MobileDiaryVersion) {
    this.versions.set(version.id, version);
  }

  async updateDiaryAfterSave(input: {
    diaryId: string;
    title: string;
    content: string;
    contentFormat: "markdown";
    latestVersionId: string;
    updatedAt: string;
  }) {
    const diary = this.diaries.get(input.diaryId);
    if (!diary) return;
    this.diaries.set(input.diaryId, {
      ...diary,
      title: input.title,
      content: input.content,
      contentFormat: input.contentFormat,
      latestVersionId: input.latestVersionId,
      updatedAt: input.updatedAt,
    });
  }
}

let repository: MemoryDiaryRepository;
let service: ReturnType<typeof createMobileDiaryService>;

beforeEach(() => {
  repository = new MemoryDiaryRepository();
  service = createMobileDiaryService(repository, async (input) => {
    const normalized = normalizeDiaryContent(input);
    return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  });
});

describe("mobile diary service", () => {
  it("deduplicates unchanged manual and auto saves", async () => {
    const diary = await service.createDiary({ title: "Today", content: "hello" });

    const manual = await service.saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "hello",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
    });
    const auto = await service.saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "hello",
      contentFormat: "markdown",
      saveType: "AUTO",
      baseVersionId: diary.latestVersionId,
    });

    expect(manual.changed).toBe(false);
    expect(auto.changed).toBe(false);
    await expect(service.listVersions(diary.id)).resolves.toHaveLength(1);
  });

  it("creates append-only versions with incrementing version numbers", async () => {
    const diary = await service.createDiary({ title: "Today", content: "hello" });
    const saved = await service.saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "hello again",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
      message: "Expand entry",
    });

    const versions = await service.listVersions(diary.id);

    expect(saved.changed).toBe(true);
    expect(saved.version.versionNumber).toBe(2);
    expect(versions.map((version) => version.versionNumber)).toEqual([2, 1]);
    expect(versions[0]?.message).toBe("Expand entry");
  });

  it("restore creates a RESTORE version instead of rolling history back", async () => {
    const diary = await service.createDiary({ title: "Today", content: "hello" });
    await service.saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "hello again",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
    });

    const firstVersion = (await service.listVersions(diary.id)).at(-1)!;
    const restored = await service.restoreVersion({ diaryId: diary.id, versionId: firstVersion.id });
    const versions = await service.listVersions(diary.id);

    expect(restored.changed).toBe(true);
    expect(restored.version.saveType).toBe("RESTORE");
    expect(restored.version.restoredFromVersionId).toBe(firstVersion.id);
    expect(versions.map((version) => version.saveType)).toEqual(["RESTORE", "MANUAL", "MANUAL"]);
  });

  it("reports stale base versions without blocking saves", async () => {
    const diary = await service.createDiary({ title: "Today", content: "one" });
    await service.saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "two",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
    });

    const staleSave = await service.saveDiaryVersion({
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

  it("diff reflects added and removed content", async () => {
    const diary = await service.createDiary({ title: "Today", content: "one\ntwo\n" });
    const saved = await service.saveDiaryVersion({
      diaryId: diary.id,
      title: "Today",
      content: "one\nthree\n",
      contentFormat: "markdown",
      saveType: "MANUAL",
      baseVersionId: diary.latestVersionId,
    });

    const diff = await service.getVersionDiff(diary.id, diary.latestVersionId!, saved.version.id);

    expect(diff.contentDiff).toContainEqual({ type: "removed", text: "two\n" });
    expect(diff.contentDiff).toContainEqual({ type: "added", text: "three\n" });
  });
});

let idCounter = 0;
function createId() {
  idCounter += 1;
  return `test_${idCounter}`;
}
