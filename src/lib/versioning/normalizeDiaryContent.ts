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
