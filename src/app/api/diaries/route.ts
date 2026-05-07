import { NextResponse } from "next/server";
import { createDiary, listDiaries } from "@/server/diaryService";
import { createDiarySchema } from "@/lib/validation";

export async function GET() {
  const diaries = await listDiaries();
  return NextResponse.json({ diaries });
}

export async function POST(request: Request) {
  const body = createDiarySchema.parse(await request.json());
  const diary = await createDiary(body);

  return NextResponse.json({ diary }, { status: 201 });
}
