import { NextResponse } from "next/server";
import { restoreDiarySchema } from "@/lib/validation";
import { restoreVersion } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { diaryId } = await params;
  const body = restoreDiarySchema.parse(await request.json());
  const result = await restoreVersion({ diaryId, ...body });

  return NextResponse.json(result);
}
