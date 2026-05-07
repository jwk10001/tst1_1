import { prisma } from "@/lib/prisma";
import { hashContent, normalizeDiaryContent } from "@/lib/versioning/hashContent";

export async function listDiaries() {
  return prisma.diary.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      latestVersionId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createDiary(input: { title: string; content: string }) {
  const normalized = normalizeDiaryContent({
    title: input.title,
    content: input.content,
    contentFormat: "markdown",
  });
  const contentHash = hashContent(normalized);

  return prisma.$transaction(async (tx) => {
    const diary = await tx.diary.create({
      data: {
        title: normalized.title,
        content: normalized.content,
        contentFormat: normalized.contentFormat,
      },
    });

    const version = await tx.diaryVersion.create({
      data: {
        diaryId: diary.id,
        versionNumber: 1,
        saveType: "MANUAL",
        titleSnapshot: normalized.title,
        contentSnapshot: normalized.content,
        contentFormat: normalized.contentFormat,
        contentHash,
        message: "Initial version",
      },
    });

    return tx.diary.update({
      where: { id: diary.id },
      data: { latestVersionId: version.id },
      include: { latestVersion: true },
    });
  });
}

export async function getDiary(diaryId: string) {
  return prisma.diary.findFirst({
    where: { id: diaryId, deletedAt: null },
    include: { latestVersion: true },
  });
}

export async function softDeleteDiary(diaryId: string) {
  return prisma.diary.update({
    where: { id: diaryId },
    data: { deletedAt: new Date() },
  });
}
