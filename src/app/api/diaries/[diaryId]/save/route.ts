import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { saveDiarySchema } from "@/lib/validation";
import { saveDiaryVersion } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { diaryId } = await params;
    const body = saveDiarySchema.parse(await request.json());
    const result = await saveDiaryVersion({ diaryId, ...body });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
