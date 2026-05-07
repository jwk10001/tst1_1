import { NextResponse } from "next/server";
import { getDiary, softDeleteDiary } from "@/server/diaryService";

type Params = { params: Promise<{ diaryId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { diaryId } = await params;
  const diary = await getDiary(diaryId);

  if (!diary) {
    return NextResponse.json({ error: "Diary not found" }, { status: 404 });
  }

  return NextResponse.json({ diary });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { diaryId } = await params;
  await softDeleteDiary(diaryId);

  return NextResponse.json({ ok: true });
}
