import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { createDiarySchema } from "@/lib/validation";
import { createDiary, listDiaries } from "@/server/diaryService";

export async function GET() {
  try {
    const diaries = await listDiaries();
    return NextResponse.json({ diaries });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createDiarySchema.parse(await request.json());
    const diary = await createDiary(body);

    return NextResponse.json({ diary }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
