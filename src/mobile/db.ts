import * as SQLite from "expo-sqlite";
import type { MobileDiary, MobileDiaryRepository, MobileDiaryVersion, MobileSaveType } from "./types";

const database = SQLite.openDatabaseSync("diary.db");

export async function initializeMobileDatabase() {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS diaries (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_format TEXT NOT NULL DEFAULT 'markdown',
      latest_version_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS diaries_updated_at_idx ON diaries(updated_at);
    CREATE INDEX IF NOT EXISTS diaries_deleted_at_idx ON diaries(deleted_at);

    CREATE TABLE IF NOT EXISTS diary_versions (
      id TEXT PRIMARY KEY NOT NULL,
      diary_id TEXT NOT NULL,
      parent_version_id TEXT,
      version_number INTEGER NOT NULL,
      save_type TEXT NOT NULL,
      title_snapshot TEXT NOT NULL,
      content_snapshot TEXT NOT NULL,
      content_format TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      message TEXT,
      base_version_id TEXT,
      restored_from_version_id TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(diary_id, version_number)
    );

    CREATE INDEX IF NOT EXISTS diary_versions_diary_created_idx ON diary_versions(diary_id, created_at);
    CREATE INDEX IF NOT EXISTS diary_versions_diary_hash_idx ON diary_versions(diary_id, content_hash);
  `);
}

export function createSQLiteDiaryRepository(): MobileDiaryRepository {
  return {
    async createDiary(input) {
      await initializeMobileDatabase();
      const now = new Date().toISOString();
      const diary: MobileDiary = {
        id: createId(),
        title: input.title,
        content: input.content,
        contentFormat: input.contentFormat,
        latestVersionId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      await database.runAsync(
        `INSERT INTO diaries (id, title, content, content_format, latest_version_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        diary.id,
        diary.title,
        diary.content,
        diary.contentFormat,
        diary.latestVersionId,
        diary.createdAt,
        diary.updatedAt,
        diary.deletedAt,
      );

      return diary;
    },

    async listDiaries() {
      await initializeMobileDatabase();
      const rows = await database.getAllAsync<DiaryRow>(
        `SELECT * FROM diaries WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
      );

      return rows.map(toDiary);
    },

    async getDiary(diaryId) {
      await initializeMobileDatabase();
      const row = await database.getFirstAsync<DiaryRow>(
        `SELECT * FROM diaries WHERE id = ? AND deleted_at IS NULL`,
        diaryId,
      );

      return row ? toDiary(row) : null;
    },

    async getVersion(diaryId, versionId) {
      await initializeMobileDatabase();
      const row = await database.getFirstAsync<VersionRow>(
        `SELECT * FROM diary_versions WHERE id = ? AND diary_id = ?`,
        versionId,
        diaryId,
      );

      return row ? toVersion(row) : null;
    },

    async listVersions(diaryId, filters = {}) {
      await initializeMobileDatabase();
      const rows = filters.saveType
        ? await database.getAllAsync<VersionRow>(
            `SELECT * FROM diary_versions WHERE diary_id = ? AND save_type = ? ORDER BY version_number DESC`,
            diaryId,
            filters.saveType,
          )
        : await database.getAllAsync<VersionRow>(
            `SELECT * FROM diary_versions WHERE diary_id = ? ORDER BY version_number DESC`,
            diaryId,
          );

      return rows.map(toVersion);
    },

    async insertVersion(version) {
      await initializeMobileDatabase();
      await database.runAsync(
        `INSERT INTO diary_versions (
          id, diary_id, parent_version_id, version_number, save_type, title_snapshot, content_snapshot,
          content_format, content_hash, message, base_version_id, restored_from_version_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        version.id,
        version.diaryId,
        version.parentVersionId,
        version.versionNumber,
        version.saveType,
        version.titleSnapshot,
        version.contentSnapshot,
        version.contentFormat,
        version.contentHash,
        version.message,
        version.baseVersionId,
        version.restoredFromVersionId,
        version.createdAt,
      );
    },

    async updateDiaryAfterSave(input) {
      await initializeMobileDatabase();
      await database.runAsync(
        `UPDATE diaries
         SET title = ?, content = ?, content_format = ?, latest_version_id = ?, updated_at = ?
         WHERE id = ?`,
        input.title,
        input.content,
        input.contentFormat,
        input.latestVersionId,
        input.updatedAt,
        input.diaryId,
      );
    },
  };
}

type DiaryRow = {
  id: string;
  title: string;
  content: string;
  content_format: "markdown";
  latest_version_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type VersionRow = {
  id: string;
  diary_id: string;
  parent_version_id: string | null;
  version_number: number;
  save_type: MobileSaveType;
  title_snapshot: string;
  content_snapshot: string;
  content_format: "markdown";
  content_hash: string;
  message: string | null;
  base_version_id: string | null;
  restored_from_version_id: string | null;
  created_at: string;
};

function toDiary(row: DiaryRow): MobileDiary {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentFormat: row.content_format,
    latestVersionId: row.latest_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toVersion(row: VersionRow): MobileDiaryVersion {
  return {
    id: row.id,
    diaryId: row.diary_id,
    parentVersionId: row.parent_version_id,
    versionNumber: row.version_number,
    saveType: row.save_type,
    titleSnapshot: row.title_snapshot,
    contentSnapshot: row.content_snapshot,
    contentFormat: row.content_format,
    contentHash: row.content_hash,
    message: row.message,
    baseVersionId: row.base_version_id,
    restoredFromVersionId: row.restored_from_version_id,
    createdAt: row.created_at,
  };
}

function createId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
