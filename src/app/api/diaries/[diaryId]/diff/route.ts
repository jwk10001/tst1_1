import { NextResponse } from "next/server";
import { getVersionDiff } from "@/server/versionService";

type Params = { params: Promise<{ diaryId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { diaryId } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const diff = await getVersionDiff(diaryId, from, to);
  return NextResponse.json({ diff });
}
