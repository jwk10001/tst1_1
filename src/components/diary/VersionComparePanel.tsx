"use client";

import { useEffect, useMemo, useState } from "react";
import { VersionDiffViewer } from "./VersionDiffViewer";

type Version = {
  id: string;
  versionNumber: number;
  saveType: string;
  titleSnapshot: string;
  message: string | null;
  createdAt: string;
};

type DiffChunk = {
  type: "added" | "removed" | "unchanged";
  text: string;
};

type DiffResult = {
  fromVersionId: string;
  toVersionId: string;
  titleDiff: DiffChunk[];
  contentDiff: DiffChunk[];
};

type VersionComparePanelProps = {
  diaryId: string;
  currentVersionId: string | null;
  dirty: boolean;
  open: boolean;
  onClose: () => void;
};

export function VersionComparePanel({ diaryId, currentVersionId, dirty, open, onClose }: VersionComparePanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [fromVersionId, setFromVersionId] = useState("");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentVersion = useMemo(
    () => versions.find((version) => version.id === currentVersionId) ?? versions[0],
    [currentVersionId, versions],
  );
  const selectableVersions = useMemo(
    () => versions.filter((version) => version.id !== currentVersion?.id),
    [currentVersion?.id, versions],
  );

  useEffect(() => {
    if (!open) return;

    async function loadVersions() {
      setLoadingVersions(true);
      setError(null);

      try {
        const response = await fetch(`/api/diaries/${diaryId}/versions`);

        if (!response.ok) {
          throw new Error("Load failed");
        }

        const data = (await response.json()) as { versions: Version[] };
        const loadedVersions = data.versions ?? [];
        const currentIndex = loadedVersions.findIndex((version) => version.id === currentVersionId);
        const fallbackCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
        const defaultFrom = loadedVersions[fallbackCurrentIndex + 1] ?? loadedVersions[fallbackCurrentIndex - 1] ?? loadedVersions[1];

        setVersions(loadedVersions);
        setFromVersionId((existing) => (loadedVersions.some((version) => version.id === existing) ? existing : defaultFrom?.id ?? ""));
      } catch {
        setError("加载失败，请重试。");
      } finally {
        setLoadingVersions(false);
      }
    }

    void loadVersions();
  }, [currentVersionId, diaryId, open]);

  useEffect(() => {
    if (!open || !currentVersion?.id || !fromVersionId || fromVersionId === currentVersion.id) {
      setDiff(null);
      return;
    }

    async function loadDiff() {
      setLoadingDiff(true);
      setError(null);

      try {
        const params = new URLSearchParams({ from: fromVersionId, to: currentVersion.id });
        const response = await fetch(`/api/diaries/${diaryId}/diff?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Diff failed");
        }

        const data = (await response.json()) as { diff: DiffResult };
        setDiff(data.diff);
      } catch {
        setError("加载失败，请重试。");
      } finally {
        setLoadingDiff(false);
      }
    }

    void loadDiff();
  }, [currentVersion?.id, diaryId, fromVersionId, open]);

  if (!open) return null;

  return (
    <section className="compare-panel card stack" aria-label="版本对比面板">
      <div className="row-between">
        <div>
          <h2>对比</h2>
          <p className="muted shortcut-hint">Alt+H 打开/关闭，Esc 关闭</p>
        </div>
        <button className="button secondary" onClick={onClose} type="button">
          关闭
        </button>
      </div>

      {dirty ? <div className="notice">对比基于已保存版本，未保存内容请先保存。</div> : null}
      {error ? <div className="notice">{error}</div> : null}
      {loadingVersions ? <p className="muted">加载版本...</p> : null}

      {!loadingVersions && versions.length < 2 ? <p className="muted">至少需要两个已保存版本才能对比。</p> : null}

      {!loadingVersions && versions.length >= 2 && currentVersion ? (
        <>
          <div className="compare-controls">
            <label className="stack">
              <span className="muted">旧版本</span>
              <select className="select" value={fromVersionId} onChange={(event) => setFromVersionId(event.target.value)}>
                {selectableVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    #{version.versionNumber} {version.titleSnapshot}
                  </option>
                ))}
              </select>
            </label>
            <div className="stack">
              <span className="muted">当前已保存版本</span>
              <div className="version-pill">#{currentVersion.versionNumber} {currentVersion.titleSnapshot}</div>
            </div>
          </div>
          {loadingDiff ? <p className="muted">加载差异...</p> : null}
          {diff ? <VersionDiffViewer diff={diff} compact /> : null}
        </>
      ) : null}
    </section>
  );
}
