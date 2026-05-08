"use client";

import { useCallback, useEffect, useState } from "react";
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

type DiaryListSort = "updatedAt_desc" | "createdAt_desc" | "title_asc";

const pageSize = 10;

export function DiaryList() {
  const [diaries, setDiaries] = useState<DiaryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sort, setSort] = useState<DiaryListSort>("updatedAt_desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function archiveDiary(diary: DiaryListItem) {
    const confirmed = window.confirm(`归档“${diary.title}”？归档后会从列表隐藏，历史版本不会删除。`);

    if (!confirmed) return;

    setArchivingId(diary.id);
    setError(null);

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
          <h1>日记本</h1>
          <p className="muted">每次保存都会形成永久历史版本。</p>
        </div>
        <button className="button" disabled={creating} onClick={createDiary}>
          {creating ? "创建中..." : "新建日记"}
        </button>
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
          <p className="muted">
            {hasSearch ? "请调整搜索关键词。" : "创建第一篇日记后，手动保存和自动保存都会出现在历史记录中。"}
          </p>
        </section>
      ) : null}

      <div className="stack">
        {diaries.map((diary) => (
          <div className="card row-between" key={diary.id}>
            <Link className="diary-card-link" href={`/diaries/${diary.id}`}>
              <div>
                <h2>{diary.title}</h2>
                <p className="muted">{diary.content.slice(0, 120) || "空白日记"}</p>
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
