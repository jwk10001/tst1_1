import { notFound } from "next/navigation";
import { VersionTimeline } from "@/components/diary/VersionTimeline";
import { AppError } from "@/lib/apiErrors";
import type { SaveType } from "@/server/versionService";
import { listVersions } from "@/server/versionService";

type Props = {
  params: Promise<{ diaryId: string }>;
  searchParams: Promise<{ saveType?: string }>;
};

export default async function DiaryHistoryPage({ params, searchParams }: Props) {
  const { diaryId } = await params;
  const { saveType } = await searchParams;
  const filter = parseSaveType(saveType);

  try {
    const versions = await listVersions(diaryId, filter ? { saveType: filter } : undefined);
    return <VersionTimeline diaryId={diaryId} versions={versions} activeSaveType={filter ?? "ALL"} />;
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

function parseSaveType(value?: string): SaveType | undefined {
  if (!value || value === "ALL") return undefined;
  if (value === "MANUAL" || value === "AUTO" || value === "RESTORE") return value;
  return undefined;
}
