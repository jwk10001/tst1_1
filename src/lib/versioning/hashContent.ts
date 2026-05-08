import { createHash } from "node:crypto";
import { normalizeDiaryContent, type HashContentInput } from "./normalizeDiaryContent";

export { normalizeDiaryContent, type HashContentInput };

export function hashContent(input: HashContentInput): string {
  const normalized = normalizeDiaryContent(input);

  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}
