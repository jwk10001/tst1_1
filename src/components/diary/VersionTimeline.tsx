"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Version = {
  id: string;
  versionNumber: number;
  saveType: string;
  titleSnapshot: string;
  message: string | null;
  createdAt: Date | string;
};

export function VersionTimeline({ diaryId, versions }: { diaryId: string; versions: Version[] }) {
  const [from, setFrom] = useState(versions.at(-1)?.id ?? "");
  const [to, setTo] = useState(versions[0]?.id ?? "");
  const diffHref = useMemo(() => `/diaries/${diaryId}/history/${to}?from=${from}`, [diaryId, from, to]);

  return (
    <main className="page stack">
      <div className="header">
        <div>
          <Link className="muted" href={`/diaries/${diaryId}`}>← 返回编辑</Link>
          <h1>历史记录</h1>
        </div>
      </div>

      {versions.length >= 2 ? (
        <section className="card row">
          <select className="select" value={from} onChange={(event) => setFrom(event.target.value)}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>#{version.versionNumber} {version.titleSnapshot}</option>
            ))}
          </select>
          <span>对比</span>
          <select className="select" value={to} onChange={(event) => setTo(event.target.value)}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>#{version.versionNumber} {version.titleSnapshot}</option>
            ))}
          </select>
          <Link className="button" href={diffHref}>查看差异</Link>
        </section>
      ) : null}

      <div className="stack">
        {versions.map((version) => (
          <Link className="card row-between" href={`/diaries/${diaryId}/history/${version.id}`} key={version.id}>
            <div>
              <div className="row">
                <span className="badge">#{version.versionNumber}</span>
                <span className="badge">{version.saveType}</span>
              </div>
              <h2>{version.titleSnapshot}</h2>
              <p className="muted">{version.message ?? "无说明"}</p>
            </div>
            <span className="muted">{new Date(version.createdAt).toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
