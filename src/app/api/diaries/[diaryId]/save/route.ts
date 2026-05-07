import { NextResponse } from "next/server";
import { saveDiarySchema } from "@/lib/validation";
import { saveDiaryVersion } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { diaryId } = await params;
  const body = saveDiarySchema.parse(await request.json());
  const result = await saveDiaryVersion({ diaryId, ...body });

  return NextResponse.json(result);
}
