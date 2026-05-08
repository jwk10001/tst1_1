import { expect, test } from "@playwright/test";

test("creates a diary, saves with message, previews markdown, and opens history", async ({ page }) => {
  await page.goto("/diaries");
  await page.getByRole("button", { name: "新建日记" }).click();
  await expect(page.getByRole("heading", { name: "编辑日记" })).toBeVisible();

  await page.getByPlaceholder("标题").fill("E2E diary");
  await page.getByPlaceholder("手动保存说明").fill("first useful entry");
  await page.getByPlaceholder("用 Markdown 记录今天...").fill("# hello history\n- item one");
  await page.getByRole("button", { name: "Markdown 预览" }).click();
  await expect(page.getByRole("heading", { name: "hello history" })).toBeVisible();

  await page.getByRole("button", { name: "手动保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();
  await page.getByRole("link", { name: "历史记录" }).click();

  await expect(page.getByRole("heading", { name: "历史记录" })).toBeVisible();
  await expect(page.getByText("first useful entry")).toBeVisible();
  await page.getByRole("link", { name: "MANUAL", exact: true }).click();
  await expect(page.getByText("first useful entry")).toBeVisible();
});
