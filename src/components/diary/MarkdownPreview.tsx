type MarkdownPreviewProps = {
  content: string;
};

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return <p className="muted">暂无内容</p>;
  }

  return (
    <div className="markdown-preview">
      {content.split("\n").map((line, index) => (
        <MarkdownLine line={line} key={index} />
      ))}
    </div>
  );
}

function MarkdownLine({ line }: { line: string }) {
  if (line.startsWith("### ")) return <h4>{line.slice(4)}</h4>;
  if (line.startsWith("## ")) return <h3>{line.slice(3)}</h3>;
  if (line.startsWith("# ")) return <h2>{line.slice(2)}</h2>;
  if (line.startsWith("- ")) return <p>• {line.slice(2)}</p>;
  if (!line.trim()) return <br />;
  return <p>{line}</p>;
}
