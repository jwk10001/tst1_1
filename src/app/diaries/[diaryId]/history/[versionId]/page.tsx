import Link from "next/link";
import { notFound } from "next/navigation";
import { RestoreButton } from "@/components/diary/RestoreButton";
import { VersionDiffViewer } from "@/components/diary/VersionDiffViewer";
import { getVersion, getVersionDiff } from "@/server/versionService";

type Props = {
  params: Promise<{ diaryId: string; versionId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function VersionDetailPage({ params, searchParams }: Props) {
  const { diaryId, versionId } = await params;
  const { from } = await searchParams;
  const version = await getVersion(diaryId, versionId);

  if (!version) {
    notFound();
  }

  const diff = from ? await getVersionDiff(diaryId, from, versionId) : null;

  return (
    <main className="page stack">
      <div className="header">
        <div>
          <Link className="muted" href={`/diaries/${diaryId}/history`}>← 返回历史记录</Link>
          <h1>版本 #{version.versionNumber}</h1>
        </div>
        <RestoreButton diaryId={diaryId} version={version} />
      </div>

      <section className="card stack">
        <div className="row">
          <span className="badge">{version.saveType}</span>
          <span className="muted">{new Date(version.createdAt).toLocaleString()}</span>
        </div>
        <h2>{version.titleSnapshot}</h2>
        <pre>{version.contentSnapshot || "空白内容"}</pre>
      </section>

      {diff ? <VersionDiffViewer diff={diff} /> : null}
    </main>
  );
}
