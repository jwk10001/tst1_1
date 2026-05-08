import { NotFoundError } from "@/lib/apiErrors";
import { prisma } from "@/lib/prisma";
import { hashContent, normalizeDiaryContent } from "@/lib/versioning/hashContent";

export type DiaryListSort = "updatedAt_desc" | "createdAt_desc" | "title_asc";

export type ListDiariesOptions = {
  q?: string;
  sort?: DiaryListSort;
  page?: number;
  pageSize?: number;
};

export async function listDiaries(options: ListDiariesOptions = {}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 10;
  const query = options.q?.trim();
  const where = {
    deletedAt: null,
    ...(query
      ? {
          OR: [{ title: { contains: query } }, { content: { contains: query } }],
        }
      : {}),
  };
  const orderBy = getDiaryListOrderBy(options.sort ?? "updatedAt_desc");
  const [diaries, total] = await prisma.$transaction([
    prisma.diary.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        content: true,
        latestVersionId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.diary.count({ where }),
  ]);

  return {
    diaries,
    page,
    pageSize,
    total,
    hasNextPage: page * pageSize < total,
  };
}

function getDiaryListOrderBy(sort: DiaryListSort) {
  if (sort === "createdAt_desc") {
    return { createdAt: "desc" as const };
  }

  if (sort === "title_asc") {
    return { title: "asc" as const };
  }

  return { updatedAt: "desc" as const };
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
  const diary = await getDiary(diaryId);

  if (!diary) {
    throw new NotFoundError("DIARY_NOT_FOUND", "Diary not found");
  }

  return prisma.diary.update({
    where: { id: diaryId },
    data: { deletedAt: new Date() },
  });
}
