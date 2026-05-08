import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { getVersion } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string; versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { diaryId, versionId } = await params;
    const version = await getVersion(diaryId, versionId);

    if (!version) {
      return NextResponse.json({ error: { code: "VERSION_NOT_FOUND", message: "Version not found" } }, { status: 404 });
    }

    return NextResponse.json({ version });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
