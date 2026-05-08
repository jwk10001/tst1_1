import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { createDiarySchema, diaryListQuerySchema } from "@/lib/validation";
import { createDiary, listDiaries } from "@/server/diaryService";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = diaryListQuerySchema.parse(Object.fromEntries(url.searchParams));
    const result = await listDiaries(query);
    return NextResponse.json(result);
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
