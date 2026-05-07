import { NextResponse } from "next/server";
import { listVersions } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { diaryId } = await params;
  const versions = await listVersions(diaryId);

  return NextResponse.json({ versions });
}
