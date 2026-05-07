import { diffLines } from "diff";

export type DiffChunk = {
  type: "added" | "removed" | "unchanged";
  text: string;
};

function toChunks(from: string, to: string): DiffChunk[] {
  return diffLines(from, to).map((part) => ({
    type: part.added ? "added" : part.removed ? "removed" : "unchanged",
    text: part.value,
  }));
}

export function diffVersions(from: { title: string; content: string }, to: { title: string; content: string }) {
  return {
    titleDiff: toChunks(from.title, to.title),
    contentDiff: toChunks(from.content, to.content),
  };
}
