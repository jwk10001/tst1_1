import { expect, test } from "@playwright/test";

test("creates a diary, saves with message, previews markdown, and opens history", async ({ page }) => {
  await page.goto("/diaries");
  await page.getByRole("button", { name: "新建日记" }).click();
  await page.waitForURL(/\/diaries\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "编辑日记" })).toBeVisible();

  await page.getByPlaceholder("标题").fill("E2E diary");
  await page.getByPlaceholder("手动保存说明").fill("first useful entry");
  await page.getByPlaceholder("用 Markdown 记录今天...").fill("# hello history\n- item one");
  await page.getByRole("button", { name: "Markdown 预览" }).click();
  await expect(page.getByText("hello history")).toBeVisible();

  await page.getByRole("button", { name: "手动保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();
  await page.getByRole("link", { name: "历史记录" }).click();

  await expect(page.getByRole("heading", { name: "历史记录" })).toBeVisible();
  await expect(page.getByText("first useful entry")).toBeVisible();
  await page.getByRole("link", { name: "MANUAL", exact: true }).click();
  await expect(page.getByText("first useful entry")).toBeVisible();
});

test("searches, sorts, and archives diaries", async ({ page }) => {
  await page.goto("/diaries");

  await createDiary(page, "Gamma E2E", "contains banana keyword");
  await createDiary(page, "Alpha E2E", "contains apple keyword");
  await createDiary(page, "Beta E2E", "contains carrot keyword");

  await page.goto("/diaries");
  await page.getByPlaceholder("搜索标题或正文").fill("apple");
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(page.getByRole("heading", { name: "Alpha E2E" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gamma E2E" })).not.toBeVisible();

  await page.getByPlaceholder("搜索标题或正文").fill("");
  await page.getByRole("button", { name: "搜索" }).click();
  await page.locator("select").selectOption("title_asc");
  await expect(page.getByRole("heading", { name: "Alpha E2E" })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".card", { has: page.getByRole("heading", { name: "Alpha E2E" }) })
    .getByRole("button", { name: "归档" })
    .click();
  await expect(page.getByRole("heading", { name: "Alpha E2E" })).not.toBeVisible();
});

async function createDiary(page: import("@playwright/test").Page, title: string, content: string) {
  await page.getByRole("button", { name: "新建日记" }).click();
  await page.waitForURL(/\/diaries\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "编辑日记" })).toBeVisible();
  await page.getByPlaceholder("标题").fill(title);
  await page.getByPlaceholder("用 Markdown 记录今天...").fill(content);
  await page.getByRole("button", { name: "手动保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();
  await page.getByRole("link", { name: "返回日记列表" }).click();
}
