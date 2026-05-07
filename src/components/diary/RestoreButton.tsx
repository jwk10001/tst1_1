"use client";

import { useRouter } from "next/navigation";

type VersionSnapshot = {
  id: string;
  diaryId: string;
  versionNumber: number;
  saveType: string;
  titleSnapshot: string;
  contentSnapshot: string;
  message: string | null;
  createdAt: Date | string;
};

export function RestoreButton({ diaryId, version }: { diaryId: string; version: VersionSnapshot }) {
  const router = useRouter();

  async function restore() {
    const confirmed = window.confirm(`恢复到版本 #${version.versionNumber}？这会创建一个新的恢复版本。`);
    if (!confirmed) return;

    const response = await fetch(`/api/diaries/${diaryId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: version.id }),
    });

    if (response.ok) {
      router.push(`/diaries/${diaryId}`);
      router.refresh();
    }
  }

  return <button className="button" onClick={restore}>恢复此版本</button>;
}
