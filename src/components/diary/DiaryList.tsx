"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";

type DiaryListItem = {
  id: string;
  title: string;
  content: string;
  latestVersionId: string | null;
  updatedAt: string;
};

type DiaryListResponse = {
  diaries: DiaryListItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

type BackupSummary = {
  importedDiaries: number;
  importedVersions: number;
  archivedDiaries: number;
};

type BackupPreview = {
  diaries: Array<{ versions: unknown[]; deletedAt: string | null }>;
};

type DiaryListSort = "updatedAt_desc" | "createdAt_desc" | "title_asc";

const pageSize = 10;

export function DiaryList() {
  const [diaries, setDiaries] = useState<DiaryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<DiaryListSort>("updatedAt_desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDiaries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        pageSize: String(pageSize),
      });

      if (submittedQuery.trim()) {
        params.set("q", submittedQuery.trim());
      }

      const response = await fetch(`/api/diaries?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Load failed");
      }

      const data = (await response.json()) as DiaryListResponse;
      setDiaries(data.diaries ?? []);
      setTotal(data.total ?? 0);
      setHasNextPage(Boolean(data.hasNextPage));
    } catch {
      setError("日记列表加载失败，请重试。");
    } finally {
      setLoading(false);
    }
  }, [page, sort, submittedQuery]);

  async function createDiary() {
    setCreating(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/diaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "新的日记", content: "" }),
      });

      if (!response.ok) {
        throw new Error("Create failed");
      }

      const data = await response.json();
      window.location.assign(`/diaries/${data.diary.id}`);
    } catch {
      setError("创建失败，请重试。");
      setCreating(false);
    }
  }

  async function exportBackup() {
    setExporting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/backups/export");
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const data = (await response.json()) as { backup: unknown };
      const backupText = JSON.stringify(data.backup, null, 2);
      const blob = new Blob([backupText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `diary-backup-${formatBackupTimestamp(new Date())}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("备份已导出。");
    } catch {
      setError("导出失败，请重试。");
    } finally {
      setExporting(false);
    }
  }

  function openImportPicker() {
    setError(null);
    setNotice(null);
    fileInputRef.current?.click();
  }

  async function importBackupFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImporting(true);
    setError(null);
    setNotice(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text) as BackupPreview;
      const diaryCount = Array.isArray(backup.diaries) ? backup.diaries.length : 0;
      const versionCount = Array.isArray(backup.diaries)
        ? backup.diaries.reduce((sum, diary) => sum + (Array.isArray(diary.versions) ? diary.versions.length : 0), 0)
        : 0;
      const archivedCount = Array.isArray(backup.diaries)
        ? backup.diaries.filter((diary) => diary.deletedAt).length
        : 0;

      const confirmed = window.confirm(
        `导入 ${diaryCount} 篇日记、${versionCount} 个版本？这不会覆盖现有数据，同名日记会并存。${
          archivedCount ? `\n其中 ${archivedCount} 篇会保持归档状态。` : ""
        }`,
      );

      if (!confirmed) {
        return;
      }

      const response = await fetch("/api/backups/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const data = (await response.json()) as { summary: BackupSummary };
      await loadDiaries();
      setNotice(
        `已导入 ${data.summary.importedDiaries} 篇日记、${data.summary.importedVersions} 个版本${
          data.summary.archivedDiaries ? `，其中 ${data.summary.archivedDiaries} 篇保持归档状态` : ""
        }。`,
      );
    } catch {
      setError("导入失败，请检查备份文件后重试。");
    } finally {
      setImporting(false);
    }
  }

  async function archiveDiary(diary: DiaryListItem) {
    const confirmed = window.confirm(`归档“${diary.title}”？归档后会从列表隐藏，历史版本不会删除。`);

    if (!confirmed) return;

    setArchivingId(diary.id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/diaries/${diary.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Archive failed");
      }

      await loadDiaries();
    } catch {
      setError("归档失败，请重试。");
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    void loadDiaries();
  }, [loadDiaries]);

  const hasSearch = Boolean(submittedQuery.trim());

  return (
    <main className="page stack">
      <div className="header">
        <div>
          <h1>日记</h1>
        </div>
        <div className="row wrap-row">
          <input
            accept="application/json,.json"
            aria-label="导入备份"
            className="sr-only"
            onChange={(event) => void importBackupFromFile(event)}
            ref={fileInputRef}
            type="file"
          />
          <button className="button secondary" disabled={exporting || importing} onClick={() => void exportBackup()} type="button">
            {exporting ? "导出中..." : "导出备份"}
          </button>
          <button className="button secondary" disabled={exporting || importing} onClick={openImportPicker} type="button">
            {importing ? "导入中..." : "导入备份"}
          </button>
          <button className="button" disabled={creating} onClick={createDiary}>
            {creating ? "创建中..." : "新建日记"}
          </button>
        </div>
      </div>

      <section className="card stack">
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSubmittedQuery(query);
          }}
        >
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题或正文"
          />
          <button className="button secondary" disabled={loading} type="submit">
            搜索
          </button>
        </form>
        <div className="row-between">
          <select
            className="select"
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value as DiaryListSort);
            }}
          >
            <option value="updatedAt_desc">最近更新</option>
            <option value="createdAt_desc">最近创建</option>
            <option value="title_asc">标题 A-Z</option>
          </select>
          <span className="muted">共 {total} 篇</span>
        </div>
      </section>

      {notice ? <section className="card notice">{notice}</section> : null}

      {error ? (
        <section className="card row-between">
          <span>{error}</span>
          <button className="button secondary" onClick={() => void loadDiaries()}>
            重试
          </button>
        </section>
      ) : null}

      {loading ? <p className="muted">加载中...</p> : null}

      {!loading && diaries.length === 0 ? (
        <section className="card stack">
          <h2>{hasSearch ? "没有匹配的日记" : "还没有日记"}</h2>
          <p className="muted">{hasSearch ? "请调整关键词。" : "创建第一篇日记。"}</p>
        </section>
      ) : null}

      <div className="stack">
        {diaries.map((diary) => (
          <div className="card row-between" key={diary.id}>
            <Link className="diary-card-link" href={`/diaries/${diary.id}`}>
              <div>
                <h2>{diary.title}</h2>
                <p className="muted">{diary.content.slice(0, 80) || "空白日记"}</p>
              </div>
              <span className="muted">{new Date(diary.updatedAt).toLocaleString()}</span>
            </Link>
            <button
              className="button danger"
              disabled={loading || archivingId === diary.id}
              onClick={() => void archiveDiary(diary)}
            >
              {archivingId === diary.id ? "归档中..." : "归档"}
            </button>
          </div>
        ))}
      </div>

      <section className="row-between">
        <button className="button secondary" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}>
          上一页
        </button>
        <span className="muted">第 {page} 页</span>
        <button className="button secondary" disabled={loading || !hasNextPage} onClick={() => setPage((current) => current + 1)}>
          下一页
        </button>
      </section>
    </main>
  );
}

function formatBackupTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
