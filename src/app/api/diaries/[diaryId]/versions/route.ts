import { NextResponse } from "next/server";
import { apiErrorResponse, ValidationAppError } from "@/lib/apiErrors";
import type { SaveType } from "@/server/versionService";
import { listVersions } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { diaryId } = await params;
    const url = new URL(request.url);
    const saveType = parseSaveType(url.searchParams.get("saveType"));
    const versions = await listVersions(diaryId, saveType ? { saveType } : undefined);

    return NextResponse.json({ versions });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function parseSaveType(value: string | null): SaveType | undefined {
  if (!value || value === "ALL") return undefined;
  if (value === "MANUAL" || value === "AUTO" || value === "RESTORE") return value;
  throw new ValidationAppError("INVALID_SAVE_TYPE", "Invalid save type");
}
