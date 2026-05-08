import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDiary, listDiaries, softDeleteDiary } from "@/server/diaryService";

beforeEach(async () => {
  await prisma.diaryVersion.deleteMany();
  await prisma.diary.deleteMany();
});

describe("diaryService", () => {
  it("searches active diaries by title and content", async () => {
    await createDiary({ title: "Work notes", content: "meeting summary" });
    await createDiary({ title: "Weekend", content: "garden plan" });

    const byTitle = await listDiaries({ q: "Work" });
    const byContent = await listDiaries({ q: "garden" });

    expect(byTitle.diaries.map((diary) => diary.title)).toEqual(["Work notes"]);
    expect(byContent.diaries.map((diary) => diary.title)).toEqual(["Weekend"]);
  });

  it("sorts diaries by title and paginates results", async () => {
    await createDiary({ title: "Charlie", content: "third" });
    await createDiary({ title: "Alpha", content: "first" });
    await createDiary({ title: "Bravo", content: "second" });

    const firstPage = await listDiaries({ sort: "title_asc", page: 1, pageSize: 2 });
    const secondPage = await listDiaries({ sort: "title_asc", page: 2, pageSize: 2 });

    expect(firstPage.diaries.map((diary) => diary.title)).toEqual(["Alpha", "Bravo"]);
    expect(firstPage.total).toBe(3);
    expect(firstPage.hasNextPage).toBe(true);
    expect(secondPage.diaries.map((diary) => diary.title)).toEqual(["Charlie"]);
    expect(secondPage.hasNextPage).toBe(false);
  });

  it("hides archived diaries without deleting their versions", async () => {
    const diary = await createDiary({ title: "Archive me", content: "keep history" });

    await softDeleteDiary(diary.id);
    const list = await listDiaries();
    const versionCount = await prisma.diaryVersion.count({ where: { diaryId: diary.id } });

    expect(list.diaries).toHaveLength(0);
    expect(versionCount).toBe(1);
  });
});
