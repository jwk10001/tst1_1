import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiErrors";
import { exportBackup } from "@/server/backupService";

export async function GET() {
  try {
    const backup = await exportBackup();
    return NextResponse.json({ backup });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
