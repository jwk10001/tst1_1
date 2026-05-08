"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseAutosaveInterval } from "@/lib/autosaveInterval";
import { AutosaveStatus } from "./AutosaveStatus";
import { MarkdownPreview } from "./MarkdownPreview";

type DiaryEditorProps = {
  diary: {
    id: string;
    title: string;
    content: string;
    latestVersionId: string | null;
  };
};

type SaveStatus = "saved" | "dirty" | "saving" | "failed";

const autosaveIntervalMs = parseAutosaveInterval(process.env.NEXT_PUBLIC_AUTOSAVE_INTERVAL_MS);

export function DiaryEditor({ diary }: DiaryEditorProps) {
  const [title, setTitle] = useState(diary.title);
  const [content, setContent] = useState(diary.content);
  const [message, setMessage] = useState("");
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const [baseVersionId, setBaseVersionId] = useState<string | null>(diary.latestVersionId);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [staleWarning, setStaleWarning] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const messageRef = useRef(message);
  const baseVersionRef = useRef(baseVersionId);
  const statusRef = useRef(status);

  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    messageRef.current = message;
    baseVersionRef.current = baseVersionId;
    statusRef.current = status;
  }, [title, content, message, baseVersionId, status]);

  const save = useCallback(
    async (saveType: "MANUAL" | "AUTO") => {
      if (statusRef.current === "saving") return;
      const submittedTitle = titleRef.current;
      const submittedContent = contentRef.current;
      const submittedMessage = saveType === "MANUAL" ? messageRef.current.trim() : null;
      const submittedBaseVersionId = baseVersionRef.current;
      setStatus("saving");

      try {
        const response = await fetch(`/api/diaries/${diary.id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: submittedTitle,
            content: submittedContent,
            contentFormat: "markdown",
            saveType,
            baseVersionId: submittedBaseVersionId,
            message: submittedMessage || null,
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
        setStaleWarning(Boolean(data.baseVersionStale));
        if (saveType === "MANUAL") {
          setMessage("");
        }
        setStatus(titleRef.current === submittedTitle && contentRef.current === submittedContent ? "saved" : "dirty");
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
    setStaleWarning(false);
    setStatus("dirty");
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
          <AutosaveStatus status={status} lastSavedAt={lastSavedAt} />
          <span className="muted">自动保存间隔：{Math.round(autosaveIntervalMs / 1000)} 秒</span>
        </div>
        {staleWarning ? (
          <div className="notice">这篇日记在你开始编辑后已有新版本；本次保存已作为新的历史版本追加。</div>
        ) : null}
        <input
          className="input"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            markDirty();
          }}
          placeholder="标题"
        />
        <input
          className="input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="手动保存说明，例如：补充今天的复盘"
          maxLength={500}
        />
        <div className="row">
          <button
            className={`button ${previewMode === "edit" ? "" : "secondary"}`}
            type="button"
            onClick={() => setPreviewMode("edit")}
          >
            编辑
          </button>
          <button
            className={`button ${previewMode === "preview" ? "" : "secondary"}`}
            type="button"
            onClick={() => setPreviewMode("preview")}
          >
            Markdown 预览
          </button>
        </div>
        {previewMode === "edit" ? (
          <textarea
            className="textarea"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              markDirty();
            }}
            placeholder="用 Markdown 记录今天..."
          />
        ) : (
          <div className="preview-panel">
            <MarkdownPreview content={content} />
          </div>
        )}
      </section>
    </main>
  );
}
