import { VersionTimeline } from "@/components/diary/VersionTimeline";
import { listVersions } from "@/server/versionService";

type Props = { params: Promise<{ diaryId: string }> };

export default async function DiaryHistoryPage({ params }: Props) {
  const { diaryId } = await params;
  const versions = await listVersions(diaryId);

  return <VersionTimeline diaryId={diaryId} versions={versions} />;
}
