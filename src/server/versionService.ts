import { prisma } from "@/lib/prisma";
import { diffVersions } from "@/lib/versioning/diffVersions";
import { hashContent, normalizeDiaryContent } from "@/lib/versioning/hashContent";

export type SaveType = "MANUAL" | "AUTO" | "RESTORE";

export async function saveDiaryVersion(input: {
  diaryId: string;
  title: string;
  content: string;
  contentFormat: "markdown";
  saveType: SaveType;
  baseVersionId?: string | null;
  message?: string | null;
  restoredFromVersionId?: string | null;
}) {
  const normalized = normalizeDiaryContent(input);
  const contentHash = hashContent(normalized);

  return prisma.$transaction(async (tx) => {
    const diary = await tx.diary.findFirst({
      where: { id: input.diaryId, deletedAt: null },
      include: { latestVersion: true },
    });

    if (!diary) {
      throw new Error("Diary not found");
    }

    if (diary.latestVersion?.contentHash === contentHash) {
      return {
        changed: false,
        diaryId: diary.id,
        version: diary.latestVersion,
      };
    }

    const latestVersionNumber = diary.latestVersion?.versionNumber ?? 0;
    const version = await tx.diaryVersion.create({
      data: {
        diaryId: diary.id,
        parentVersionId: diary.latestVersionId,
        versionNumber: latestVersionNumber + 1,
        saveType: input.saveType,
        titleSnapshot: normalized.title,
        contentSnapshot: normalized.content,
        contentFormat: normalized.contentFormat,
        contentHash,
        message: input.message ?? defaultMessage(input.saveType),
        baseVersionId: input.baseVersionId ?? null,
        restoredFromVersionId: input.restoredFromVersionId ?? null,
      },
    });

    await tx.diary.update({
      where: { id: diary.id },
      data: {
        title: normalized.title,
        content: normalized.content,
        contentFormat: normalized.contentFormat,
        latestVersionId: version.id,
      },
    });

    return {
      changed: true,
      diaryId: diary.id,
      version,
    };
  });
}

export async function listVersions(diaryId: string) {
  return prisma.diaryVersion.findMany({
    where: { diaryId, diary: { deletedAt: null } },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      diaryId: true,
      parentVersionId: true,
      versionNumber: true,
      saveType: true,
      titleSnapshot: true,
      contentHash: true,
      message: true,
      baseVersionId: true,
      restoredFromVersionId: true,
      createdAt: true,
    },
  });
}

export async function getVersion(diaryId: string, versionId: string) {
  return prisma.diaryVersion.findFirst({
    where: { id: versionId, diaryId, diary: { deletedAt: null } },
  });
}

export async function getVersionDiff(diaryId: string, fromVersionId: string, toVersionId: string) {
  const [from, to] = await Promise.all([
    getVersion(diaryId, fromVersionId),
    getVersion(diaryId, toVersionId),
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

export async function restoreVersion(input: {
  diaryId: string;
  versionId: string;
  baseVersionId?: string | null;
}) {
  const version = await getVersion(input.diaryId, input.versionId);

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
    message: `Restored version ${version.versionNumber}`,
    restoredFromVersionId: version.id,
  });
}

function defaultMessage(saveType: SaveType) {
  if (saveType === "AUTO") return "Autosave";
  if (saveType === "RESTORE") return "Restore";
  return "Manual save";
}
