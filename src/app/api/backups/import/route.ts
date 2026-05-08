import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { importBackupSchema } from "@/lib/validation";
import { importBackup } from "@/server/backupService";

export async function POST(request: Request) {
  try {
    const body = importBackupSchema.parse(await request.json());
    const summary = await importBackup(body.backup);
    return NextResponse.json({ summary }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
