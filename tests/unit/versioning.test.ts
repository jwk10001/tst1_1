import { describe, expect, it } from "vitest";
import { diffVersions } from "@/lib/versioning/diffVersions";
import { hashContent, normalizeDiaryContent } from "@/lib/versioning/hashContent";

describe("hashContent", () => {
  it("returns stable hashes for normalized content", () => {
    const first = hashContent({ title: "  Test  ", content: "a\r\nb", contentFormat: "markdown" });
    const second = hashContent({ title: "Test", content: "a\nb", contentFormat: "markdown" });

    expect(first).toBe(second);
  });

  it("normalizes blank titles", () => {
    expect(normalizeDiaryContent({ title: " ", content: "", contentFormat: "markdown" }).title).toBe("Untitled diary");
  });
});

describe("diffVersions", () => {
  it("returns added and removed chunks", () => {
    const diff = diffVersions(
      { title: "Old", content: "line one\nline two\n" },
      { title: "New", content: "line one\nline three\n" },
    );

    expect(diff.titleDiff.some((chunk) => chunk.type === "removed")).toBe(true);
    expect(diff.titleDiff.some((chunk) => chunk.type === "added")).toBe(true);
    expect(diff.contentDiff.some((chunk) => chunk.type === "removed")).toBe(true);
    expect(diff.contentDiff.some((chunk) => chunk.type === "added")).toBe(true);
  });
});
