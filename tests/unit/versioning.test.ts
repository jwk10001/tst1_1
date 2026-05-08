import { describe, expect, it } from "vitest";
import { parseAutosaveInterval } from "@/lib/autosaveInterval";
import { diffVersions } from "@/lib/versioning/diffVersions";
import { hashContent, normalizeDiaryContent } from "@/lib/versioning/hashContent";

describe("autosave interval", () => {
  it("falls back for invalid values and clamps large values", () => {
    expect(parseAutosaveInterval("bad")).toBe(120_000);
    expect(parseAutosaveInterval("0")).toBe(120_000);
    expect(parseAutosaveInterval("999")).toBe(120_000);
    expect(parseAutosaveInterval("999999999")).toBe(1_800_000);
  });
});

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
