import { createHash } from "node:crypto";

export type HashContentInput = {
  title: string;
  content: string;
  contentFormat: string;
};

export function normalizeDiaryContent(input: HashContentInput): HashContentInput {
  return {
    title: input.title.trim() || "Untitled diary",
    content: input.content.replace(/\r\n/g, "\n"),
    contentFormat: input.contentFormat,
  };
}

export function hashContent(input: HashContentInput): string {
  const normalized = normalizeDiaryContent(input);

  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}
