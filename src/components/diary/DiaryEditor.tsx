"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type DiaryEditorProps = {
  diary: {
    id: string;
    title: string;
    content: string;
    latestVersionId: string | null;
  };
};

type SaveStatus = "saved" | "dirty" | "saving" | "failed";

const autosaveIntervalMs = Number(process.env.NEXT_PUBLIC_AUTOSAVE_INTERVAL_MS ?? 120_000);

export function DiaryEditor({ diary }: DiaryEditorProps) {
  const [title, setTitle] = useState(diary.title);
  const [content, setContent] = useState(diary.content);
  const [baseVersionId, setBaseVersionId] = useState<string | null>(diary.latestVersionId);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const baseVersionRef = useRef(baseVersionId);
  const statusRef = useRef(status);

  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    baseVersionRef.current = baseVersionId;
    statusRef.current = status;
  }, [title, content, baseVersionId, status]);

  const save = useCallback(
    async (saveType: "MANUAL" | "AUTO") => {
      if (statusRef.current === "saving") return;
      setStatus("saving");

      try {
        const response = await fetch(`/api/diaries/${diary.id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titleRef.current,
            content: contentRef.current,
            contentFormat: "markdown",
            saveType,
            baseVersionId: baseVersionRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error("Save failed");
        }

        const data = await response.json();
        if (data.version?.id) {
          setBaseVersionId(data.version.id);
        }
        setLastSavedAt(new Date());
        setStatus("saved");
      } catch {
        setStatus("failed");
      }
    },
    [diary.id],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (statusRef.current === "dirty" || statusRef.current === "failed") {
        void save("AUTO");
      }
    }, autosaveIntervalMs);

    return () => window.clearInterval(interval);
  }, [save]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (statusRef.current === "dirty" || statusRef.current === "failed") {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  function markDirty() {
    setStatus((current) => (current === "saving" ? current : "dirty"));
  }

  return (
    <main className="page stack">
      <div className="header">
        <div>
          <Link className="muted" href="/diaries">← 返回日记列表</Link>
          <h1>编辑日记</h1>
        </div>
        <div className="row">
          <Link className="button secondary" href={`/diaries/${diary.id}/history`}>历史记录</Link>
          <button className="button" disabled={status === "saving"} onClick={() => void save("MANUAL")}>
            {status === "saving" ? "保存中..." : "手动保存"}
          </button>
        </div>
      </div>

      <section className="card stack">
        <div className="row-between">
          <StatusLabel status={status} lastSavedAt={lastSavedAt} />
          <span className="muted">自动保存间隔：{Math.round(autosaveIntervalMs / 1000)} 秒</span>
        </div>
        <input
          className="input"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            markDirty();
          }}
          placeholder="标题"
        />
        <textarea
          className="textarea"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            markDirty();
          }}
          placeholder="用 Markdown 记录今天..."
        />
      </section>
    </main>
  );
}

function StatusLabel({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: Date | null }) {
  if (status === "saving") return <span className="badge">保存中</span>;
  if (status === "dirty") return <span className="badge">有未保存改动</span>;
  if (status === "failed") return <span className="badge">保存失败，等待重试</span>;
  return <span className="badge">{lastSavedAt ? `已保存于 ${lastSavedAt.toLocaleTimeString()}` : "已保存"}</span>;
}
