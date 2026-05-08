import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { restoreDiarySchema } from "@/lib/validation";
import { restoreVersion } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { diaryId } = await params;
    const body = restoreDiarySchema.parse(await request.json());
    const result = await restoreVersion({ diaryId, ...body });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
