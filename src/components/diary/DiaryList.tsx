"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DiaryListItem = {
  id: string;
  title: string;
  content: string;
  latestVersionId: string | null;
  updatedAt: string;
};

export function DiaryList() {
  const [diaries, setDiaries] = useState<DiaryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadDiaries() {
    setLoading(true);
    const response = await fetch("/api/diaries");
    const data = await response.json();
    setDiaries(data.diaries ?? []);
    setLoading(false);
  }

  async function createDiary() {
    setCreating(true);
    const response = await fetch("/api/diaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新的日记", content: "" }),
    });
    const data = await response.json();
    window.location.href = `/diaries/${data.diary.id}`;
  }

  useEffect(() => {
    void loadDiaries();
  }, []);

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

      {loading ? <p className="muted">加载中...</p> : null}

      {!loading && diaries.length === 0 ? (
        <section className="card stack">
          <h2>还没有日记</h2>
          <p className="muted">创建第一篇日记后，手动保存和自动保存都会出现在历史记录中。</p>
        </section>
      ) : null}

      <div className="stack">
        {diaries.map((diary) => (
          <Link className="card row-between" href={`/diaries/${diary.id}`} key={diary.id}>
            <div>
              <h2>{diary.title}</h2>
              <p className="muted">{diary.content.slice(0, 120) || "空白日记"}</p>
            </div>
            <span className="muted">{new Date(diary.updatedAt).toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
