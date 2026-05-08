import { normalizeDiaryContent } from "@/lib/versioning/normalizeDiaryContent";
import { diffVersions } from "@/lib/versioning/diffVersions";
import type { MobileDiaryRepository, MobileDiaryVersion, MobileHashFunction, MobileSaveType } from "./types";

type SaveInput = {
  diaryId: string;
  title: string;
  content: string;
  contentFormat: "markdown";
  saveType: MobileSaveType;
  baseVersionId?: string | null;
  message?: string | null;
  restoredFromVersionId?: string | null;
};

export function createMobileDiaryService(repository: MobileDiaryRepository, hashContent: MobileHashFunction) {
  async function saveDiaryVersion(input: SaveInput) {
      const normalized = normalizeDiaryContent(input);
      const contentHash = await hashContent({ ...normalized, contentFormat: "markdown" });
      const diary = await repository.getDiary(input.diaryId);

      if (!diary) {
        throw new Error("Diary not found");
      }

      const latestVersion = diary.latestVersionId ? await repository.getVersion(diary.id, diary.latestVersionId) : null;
      const isRestore = input.saveType === "RESTORE";

      if (!isRestore && latestVersion?.contentHash === contentHash) {
        return {
          changed: false,
          diaryId: diary.id,
          version: latestVersion,
          baseVersionStale: Boolean(input.baseVersionId && input.baseVersionId !== diary.latestVersionId),
        };
      }

      const now = new Date().toISOString();
      const version = buildVersion({
        diaryId: diary.id,
        parentVersionId: diary.latestVersionId,
        versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
        saveType: input.saveType,
        title: normalized.title,
        content: normalized.content,
        contentHash,
        message: input.message ?? defaultMessage(input.saveType),
        baseVersionId: input.baseVersionId ?? null,
        restoredFromVersionId: input.restoredFromVersionId ?? null,
        createdAt: now,
      });

      await repository.insertVersion(version);
      await repository.updateDiaryAfterSave({
        diaryId: diary.id,
        title: normalized.title,
        content: normalized.content,
        contentFormat: "markdown",
        latestVersionId: version.id,
        updatedAt: now,
      });

      return {
        changed: true,
        diaryId: diary.id,
        version,
        baseVersionStale: Boolean(input.baseVersionId && input.baseVersionId !== diary.latestVersionId),
      };
  }

  async function createDiary(input: { title: string; content: string }) {
    const normalized = normalizeDiaryContent({ ...input, contentFormat: "markdown" });
    const diary = await repository.createDiary({ ...normalized, contentFormat: "markdown" });
    const contentHash = await hashContent({
      title: diary.title,
      content: diary.content,
      contentFormat: diary.contentFormat,
    });
    const now = new Date().toISOString();
    const version = buildVersion({
      diaryId: diary.id,
      parentVersionId: null,
      versionNumber: 1,
      saveType: "MANUAL",
      title: diary.title,
      content: diary.content,
      contentHash,
      message: "Initial version",
      baseVersionId: null,
      restoredFromVersionId: null,
      createdAt: now,
    });

    await repository.insertVersion(version);
    await repository.updateDiaryAfterSave({
      diaryId: diary.id,
      title: diary.title,
      content: diary.content,
      contentFormat: diary.contentFormat,
      latestVersionId: version.id,
      updatedAt: now,
    });

    return { ...diary, latestVersionId: version.id, updatedAt: now };
  }

  async function restoreVersion(input: { diaryId: string; versionId: string; baseVersionId?: string | null }) {
    const version = await repository.getVersion(input.diaryId, input.versionId);

    if (!version) {
      throw new Error("Version not found");
    }

    return saveDiaryVersion({
      diaryId: input.diaryId,
      title: version.titleSnapshot,
      content: version.contentSnapshot,
      contentFormat: "markdown",
      saveType: "RESTORE",
      baseVersionId: input.baseVersionId,
      message: `Restored version #${version.versionNumber}`,
      restoredFromVersionId: version.id,
    });
  }

  async function getVersionDiff(diaryId: string, fromVersionId: string, toVersionId: string) {
    const [from, to] = await Promise.all([
      repository.getVersion(diaryId, fromVersionId),
      repository.getVersion(diaryId, toVersionId),
    ]);

    if (!from || !to) {
      throw new Error("Version not found");
    }

    return {
      fromVersionId,
      toVersionId,
      ...diffVersions(
        { title: from.titleSnapshot, content: from.contentSnapshot },
        { title: to.titleSnapshot, content: to.contentSnapshot },
      ),
    };
  }

  return {
    listDiaries: () => repository.listDiaries(),
    getDiary: (diaryId: string) => repository.getDiary(diaryId),
    listVersions: (diaryId: string, filters: { saveType?: MobileSaveType } = {}) => repository.listVersions(diaryId, filters),
    getVersion: (diaryId: string, versionId: string) => repository.getVersion(diaryId, versionId),
    createDiary,
    saveDiaryVersion,
    restoreVersion,
    getVersionDiff,
  };
}

function buildVersion(input: {
  diaryId: string;
  parentVersionId: string | null;
  versionNumber: number;
  saveType: MobileSaveType;
  title: string;
  content: string;
  contentHash: string;
  message: string | null;
  baseVersionId: string | null;
  restoredFromVersionId: string | null;
  createdAt: string;
}): MobileDiaryVersion {
  return {
    id: createId(),
    diaryId: input.diaryId,
    parentVersionId: input.parentVersionId,
    versionNumber: input.versionNumber,
    saveType: input.saveType,
    titleSnapshot: input.title,
    contentSnapshot: input.content,
    contentFormat: "markdown",
    contentHash: input.contentHash,
    message: input.message,
    baseVersionId: input.baseVersionId,
    restoredFromVersionId: input.restoredFromVersionId,
    createdAt: input.createdAt,
  };
}

function defaultMessage(saveType: MobileSaveType) {
  if (saveType === "AUTO") return "Autosave";
  if (saveType === "RESTORE") return "Restore";
  return "Manual save";
}

function createId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
