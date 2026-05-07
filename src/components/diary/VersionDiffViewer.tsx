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

export function VersionDiffViewer({ diff }: { diff: DiffResult }) {
  return (
    <section className="card stack">
      <h2>版本差异</h2>
      <div>
        <h3>标题</h3>
        <DiffChunks chunks={diff.titleDiff} />
      </div>
      <div>
        <h3>正文</h3>
        <DiffChunks chunks={diff.contentDiff} />
      </div>
    </section>
  );
}

function DiffChunks({ chunks }: { chunks: DiffChunk[] }) {
  return (
    <pre>
      {chunks.map((chunk, index) => (
        <span className={`diff-${chunk.type}`} key={`${chunk.type}-${index}`}>
          {chunk.text}
        </span>
      ))}
    </pre>
  );
}
