import { NextResponse } from "next/server";
import { apiErrorResponse, ValidationAppError } from "@/lib/apiErrors";
import { getVersionDiff } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { diaryId } = await params;
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      throw new ValidationAppError("INVALID_DIFF_RANGE", "from and to are required");
    }

    const diff = await getVersionDiff(diaryId, from, to);
    return NextResponse.json({ diff });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
