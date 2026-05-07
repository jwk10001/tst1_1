import { NextResponse } from "next/server";
import { getVersion } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string; versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { diaryId, versionId } = await params;
  const version = await getVersion(diaryId, versionId);

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({ version });
}
