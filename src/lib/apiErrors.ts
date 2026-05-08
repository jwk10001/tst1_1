import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}

export class ValidationAppError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 400);
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid request" } },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }

  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
}
