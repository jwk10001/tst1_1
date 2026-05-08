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

type DiffRow = {
  type: "added" | "removed" | "unchanged";
  left: string;
  right: string;
};

export function VersionDiffViewer({ diff }: { diff: DiffResult }) {
  return (
    <section className="card stack">
      <h2>版本差异</h2>
      <div>
        <h3>标题</h3>
        <SideBySideDiff chunks={diff.titleDiff} />
      </div>
      <div>
        <h3>正文</h3>
        <SideBySideDiff chunks={diff.contentDiff} />
      </div>
    </section>
  );
}

function SideBySideDiff({ chunks }: { chunks: DiffChunk[] }) {
  const rows = toRows(chunks);

  if (rows.every((row) => row.type === "unchanged")) {
    return <p className="muted">两个版本相同。</p>;
  }

  return (
    <div className="diff-grid">
      <div className="diff-header">旧版本</div>
      <div className="diff-header">新版本</div>
      {rows.map((row, index) => (
        <div className="diff-row" key={index}>
          <pre className={row.type === "removed" ? "diff-removed" : row.type === "unchanged" ? "diff-unchanged" : "diff-empty"}>
            {row.left}
          </pre>
          <pre className={row.type === "added" ? "diff-added" : row.type === "unchanged" ? "diff-unchanged" : "diff-empty"}>
            {row.right}
          </pre>
        </div>
      ))}
    </div>
  );
}

function toRows(chunks: DiffChunk[]): DiffRow[] {
  return chunks.flatMap((chunk) => {
    const lines = chunk.text.split("\n");
    if (lines.at(-1) === "") lines.pop();
    const safeLines = lines.length > 0 ? lines : [""];

    return safeLines.map((line) => ({
      type: chunk.type,
      left: chunk.type === "added" ? "" : line,
      right: chunk.type === "removed" ? "" : line,
    }));
  });
}
