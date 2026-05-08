import { z } from "zod";

export const contentFormatSchema = z.literal("markdown");
export const saveTypeSchema = z.enum(["MANUAL", "AUTO", "RESTORE"]);
export const isoDateTimeSchema = z.string().min(1);

export const diaryListQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  sort: z.enum(["updatedAt_desc", "createdAt_desc", "title_asc"]).optional().default("updatedAt_desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});

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

export const backupVersionSchema = z.object({
  id: z.string().min(1),
  diaryId: z.string().min(1),
  parentVersionId: z.string().min(1).nullable(),
  versionNumber: z.number().int().min(1),
  saveType: saveTypeSchema,
  titleSnapshot: z.string().trim().min(1).max(200),
  contentSnapshot: z.string().max(200_000),
  contentFormat: contentFormatSchema,
  contentHash: z.string().min(1),
  message: z.string().max(500).nullable(),
  baseVersionId: z.string().min(1).nullable(),
  restoredFromVersionId: z.string().min(1).nullable(),
  createdAt: isoDateTimeSchema,
});

export const backupDiarySchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(200_000),
  contentFormat: contentFormatSchema,
  latestVersionId: z.string().min(1).nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable(),
  versions: z.array(backupVersionSchema),
});

export const backupPayloadSchema = z.object({
  schemaVersion: z.number().int().min(1),
  exportedAt: isoDateTimeSchema,
  diaries: z.array(backupDiarySchema),
});

export const importBackupSchema = z.object({
  backup: backupPayloadSchema,
});

export type BackupVersionPayload = z.infer<typeof backupVersionSchema>;
export type BackupDiaryPayload = z.infer<typeof backupDiarySchema>;
export type BackupPayload = z.infer<typeof backupPayloadSchema>;
