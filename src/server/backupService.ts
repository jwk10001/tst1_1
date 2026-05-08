import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ConflictError, ValidationAppError } from "@/lib/apiErrors";
import {
  type BackupDiaryPayload,
  type BackupPayload,
  type BackupVersionPayload,
  backupPayloadSchema,
} from "@/lib/validation";
import { hashContent, normalizeDiaryContent } from "@/lib/versioning/hashContent";

export type ImportBackupSummary = {
  importedDiaries: number;
  importedVersions: number;
  archivedDiaries: number;
};

export async function exportBackup(): Promise<BackupPayload> {
  const diaries = await prisma.diary.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      versions: {
        orderBy: { versionNumber: "asc" },
      },
    },
  });

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    diaries: diaries.map((diary) => ({
      id: diary.id,
      title: diary.title,
      content: diary.content,
      contentFormat: "markdown",
      latestVersionId: diary.latestVersionId,
      createdAt: diary.createdAt.toISOString(),
      updatedAt: diary.updatedAt.toISOString(),
      deletedAt: diary.deletedAt?.toISOString() ?? null,
      versions: diary.versions.map((version) => ({
        id: version.id,
        diaryId: version.diaryId,
        parentVersionId: version.parentVersionId,
        versionNumber: version.versionNumber,
        saveType: version.saveType as BackupVersionPayload["saveType"],
        titleSnapshot: version.titleSnapshot,
        contentSnapshot: version.contentSnapshot,
        contentFormat: "markdown",
        contentHash: version.contentHash,
        message: version.message,
        baseVersionId: version.baseVersionId,
        restoredFromVersionId: version.restoredFromVersionId,
        createdAt: version.createdAt.toISOString(),
      })),
    })),
  };
}

export async function importBackup(input: unknown): Promise<ImportBackupSummary> {
  const backup = backupPayloadSchema.parse(input);
  validateBackupPayload(backup);

  return prisma.$transaction(async (tx) => {
    let importedDiaries = 0;
    let importedVersions = 0;
    let archivedDiaries = 0;

    for (const diary of backup.diaries) {
      const diaryId = randomUUID();
      const versionIdMap = new Map<string, string>();

      for (const version of diary.versions) {
        versionIdMap.set(version.id, randomUUID());
      }

      const latestVersionId = diary.latestVersionId ? versionIdMap.get(diary.latestVersionId) : null;
      if (diary.latestVersionId && !latestVersionId) {
        throw new ConflictError("INVALID_BACKUP_LATEST_VERSION", "Backup latestVersionId is missing from versions");
      }

      await tx.diary.create({
        data: {
          id: diaryId,
          title: diary.title,
          content: diary.content,
          contentFormat: "markdown",
          latestVersionId: null,
          createdAt: parseDateField(diary.createdAt, "diary.createdAt"),
          updatedAt: parseDateField(diary.updatedAt, "diary.updatedAt"),
          deletedAt: diary.deletedAt ? parseDateField(diary.deletedAt, "diary.deletedAt") : null,
        },
      });

      for (const version of diary.versions) {
        await tx.diaryVersion.create({
          data: {
            id: versionIdMap.get(version.id)!,
            diaryId,
            parentVersionId: mapOptionalVersionId(version.parentVersionId, versionIdMap, "parentVersionId"),
            versionNumber: version.versionNumber,
            saveType: version.saveType as BackupVersionPayload["saveType"],
            titleSnapshot: version.titleSnapshot,
            contentSnapshot: version.contentSnapshot,
            contentFormat: "markdown",
            contentHash: version.contentHash,
            message: version.message,
            baseVersionId: mapOptionalVersionId(version.baseVersionId, versionIdMap, "baseVersionId"),
            restoredFromVersionId: mapOptionalVersionId(version.restoredFromVersionId, versionIdMap, "restoredFromVersionId"),
            createdAt: parseDateField(version.createdAt, "version.createdAt"),
          },
        });
      }

      await tx.diary.update({
        where: { id: diaryId },
        data: {
          latestVersionId,
          title: diary.title,
          content: diary.content,
          contentFormat: "markdown",
          updatedAt: parseDateField(diary.updatedAt, "diary.updatedAt"),
          deletedAt: diary.deletedAt ? parseDateField(diary.deletedAt, "diary.deletedAt") : null,
        },
      });

      importedDiaries += 1;
      importedVersions += diary.versions.length;
      if (diary.deletedAt) archivedDiaries += 1;
    }

    return { importedDiaries, importedVersions, archivedDiaries };
  });
}

function validateBackupPayload(backup: BackupPayload) {
  if (backup.schemaVersion !== 1) {
    throw new ValidationAppError("UNSUPPORTED_BACKUP_SCHEMA", "Unsupported backup schema version");
  }

  for (const diary of backup.diaries) {
    validateDiaryPayload(diary);
  }
}

function validateDiaryPayload(diary: BackupDiaryPayload) {
  if (diary.versions.length === 0) {
    throw new ValidationAppError("INVALID_BACKUP_EMPTY_DIARY", "Backup diary must include at least one version");
  }

  const versionIds = new Set(diary.versions.map((version) => version.id));
  if (versionIds.size !== diary.versions.length) {
    throw new ValidationAppError("INVALID_BACKUP_DUPLICATE_VERSION_ID", "Backup diary contains duplicate version ids");
  }

  if (!diary.latestVersionId || !versionIds.has(diary.latestVersionId)) {
    throw new ValidationAppError("INVALID_BACKUP_LATEST_VERSION", "Backup diary latestVersionId is invalid");
  }

  const versionNumbers = diary.versions.map((version) => version.versionNumber).sort((left, right) => left - right);
  for (let index = 0; index < versionNumbers.length; index += 1) {
    if (versionNumbers[index] !== index + 1) {
      throw new ValidationAppError("INVALID_BACKUP_VERSION_ORDER", "Backup diary version numbers must be continuous");
    }
  }

  const latestVersion = diary.versions.find((version) => version.id === diary.latestVersionId);
  if (!latestVersion) {
    throw new ValidationAppError("INVALID_BACKUP_LATEST_VERSION", "Backup diary latestVersionId is invalid");
  }

  const normalizedDiary = normalizeDiaryContent({
    title: diary.title,
    content: diary.content,
    contentFormat: diary.contentFormat,
  });
  const normalizedLatest = normalizeDiaryContent({
    title: latestVersion.titleSnapshot,
    content: latestVersion.contentSnapshot,
    contentFormat: latestVersion.contentFormat,
  });

  if (
    normalizedDiary.title !== normalizedLatest.title ||
    normalizedDiary.content !== normalizedLatest.content ||
    normalizedDiary.contentFormat !== normalizedLatest.contentFormat
  ) {
    throw new ValidationAppError("INVALID_BACKUP_LATEST_CONTENT", "Backup diary current content must match its latest version");
  }

  for (const version of diary.versions) {
    validateVersionPayload(diary, version, versionIds);
  }
}

function validateVersionPayload(diary: BackupDiaryPayload, version: BackupVersionPayload, versionIds: Set<string>) {
  if (version.diaryId !== diary.id) {
    throw new ValidationAppError("INVALID_BACKUP_VERSION_DIARY", "Backup version diaryId does not match its parent diary");
  }

  const expectedHash = hashContent({
    title: version.titleSnapshot,
    content: version.contentSnapshot,
    contentFormat: version.contentFormat,
  });
  if (expectedHash !== version.contentHash) {
    throw new ValidationAppError("INVALID_BACKUP_CONTENT_HASH", "Backup version content hash is invalid");
  }

  assertVersionReference(version.parentVersionId, versionIds, "parentVersionId");
  assertVersionReference(version.baseVersionId, versionIds, "baseVersionId");
  assertVersionReference(version.restoredFromVersionId, versionIds, "restoredFromVersionId");
}

function assertVersionReference(value: string | null, versionIds: Set<string>, field: string) {
  if (!value) {
    return;
  }

  if (!versionIds.has(value)) {
    throw new ValidationAppError("INVALID_BACKUP_VERSION_REFERENCE", `Backup version ${field} is invalid`);
  }
}

function mapOptionalVersionId(
  value: string | null,
  versionIdMap: Map<string, string>,
  field: string,
) {
  if (!value) {
    return null;
  }

  const mapped = versionIdMap.get(value);
  if (!mapped) {
    throw new ConflictError("INVALID_BACKUP_VERSION_REFERENCE", `Backup ${field} is missing from imported versions`);
  }

  return mapped;
}

function parseDateField(value: string, field: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ValidationAppError("INVALID_BACKUP_DATE", `Backup ${field} is invalid`);
  }

  return date;
}
