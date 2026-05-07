import { notFound } from "next/navigation";
import { DiaryEditor } from "@/components/diary/DiaryEditor";
import { getDiary } from "@/server/diaryService";

type Props = { params: Promise<{ diaryId: string }> };

export default async function DiaryPage({ params }: Props) {
  const { diaryId } = await params;
  const diary = await getDiary(diaryId);

  if (!diary) {
    notFound();
  }

  return (
    <DiaryEditor
      diary={{
        id: diary.id,
        title: diary.title,
        content: diary.content,
        latestVersionId: diary.latestVersionId,
      }}
    />
  );
}
