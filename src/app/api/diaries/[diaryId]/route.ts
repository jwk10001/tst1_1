import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { getDiary, softDeleteDiary } from "@/server/diaryService";

type Params = { params: Promise<{ diaryId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { diaryId } = await params;
    const diary = await getDiary(diaryId);

    if (!diary) {
      return NextResponse.json({ error: { code: "DIARY_NOT_FOUND", message: "Diary not found" } }, { status: 404 });
    }

    return NextResponse.json({ diary });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { diaryId } = await params;
    await softDeleteDiary(diaryId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
