import { test, expect } from "@playwright/test";

test("creates a diary and opens the editor", async ({ page }) => {
  await page.goto("/diaries");
  await page.getByRole("button", { name: "新建日记" }).click();
  await expect(page.getByRole("heading", { name: "编辑日记" })).toBeVisible();
  await page.getByPlaceholder("标题").fill("E2E diary");
  await page.getByPlaceholder("用 Markdown 记录今天...").fill("hello history");
  await page.getByRole("button", { name: "手动保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();
});
