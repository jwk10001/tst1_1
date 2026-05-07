import { z } from "zod";

export const contentFormatSchema = z.literal("markdown");
export const saveTypeSchema = z.enum(["MANUAL", "AUTO", "RESTORE"]);

export const createDiarySchema = z.object({
  title: z.string().trim().min(1).max(200).default("Untitled diary"),
  content: z.string().max(200_000).default(""),
});

export const saveDiarySchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(200_000),
  contentFormat: contentFormatSchema.default("markdown"),
  saveType: saveTypeSchema,
  baseVersionId: z.string().optional().nullable(),
  message: z.string().max(500).optional().nullable(),
});

export const restoreDiarySchema = z.object({
  versionId: z.string().min(1),
  baseVersionId: z.string().optional().nullable(),
});
