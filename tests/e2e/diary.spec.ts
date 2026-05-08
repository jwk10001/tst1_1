import { expect, test } from "@playwright/test";

test("creates a diary, saves with message, previews markdown, and opens history", async ({ page }) => {
  await page.goto("/diaries");
  await page.getByRole("button", { name: "新建日记" }).click();
  await page.waitForURL(/\/diaries\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "编辑" })).toBeVisible();

  await page.getByPlaceholder("标题").fill("E2E diary");
  await page.getByPlaceholder("保存说明（可选）").fill("first useful entry");
  await page.getByPlaceholder("用 Markdown 记录今天...").fill("# hello history\n- item one");
  await page.getByRole("button", { name: "预览" }).click();
  await expect(page.getByText("hello history")).toBeVisible();

  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();
  await page.getByRole("link", { name: "历史" }).click();

  await expect(page.getByRole("heading", { name: "历史" })).toBeVisible();
  await expect(page.getByText("first useful entry")).toBeVisible();
  await page.getByRole("link", { name: "MANUAL", exact: true }).click();
  await expect(page.getByText("first useful entry")).toBeVisible();
});

test("searches, sorts, and archives diaries", async ({ page }) => {
  const suffix = Date.now().toString();
  const gammaTitle = `Gamma E2E ${suffix}`;
  const alphaTitle = `Alpha E2E ${suffix}`;
  const betaTitle = `Beta E2E ${suffix}`;

  await page.goto("/diaries");

  await createDiary(page, gammaTitle, `contains banana keyword ${suffix}`);
  await createDiary(page, alphaTitle, `contains apple keyword ${suffix}`);
  await createDiary(page, betaTitle, `contains carrot keyword ${suffix}`);

  await page.goto("/diaries");
  await page.getByPlaceholder("搜索标题或正文").fill(`apple keyword ${suffix}`);
  await page.getByRole("button", { name: "搜索" }).click();
  await expect(page.getByRole("heading", { name: alphaTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: gammaTitle })).not.toBeVisible();

  await page.getByPlaceholder("搜索标题或正文").fill("");
  await page.getByRole("button", { name: "搜索" }).click();
  await page.locator("select").selectOption("title_asc");
  await expect(page.getByRole("heading", { name: alphaTitle })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".card", { has: page.getByRole("heading", { name: alphaTitle }) })
    .getByRole("button", { name: "归档" })
    .click();
  await expect(page.getByRole("heading", { name: alphaTitle })).not.toBeVisible();
});

test("opens saved-version compare from the editor shortcut", async ({ page }) => {
  await page.goto("/diaries");
  await page.getByRole("button", { name: "新建日记" }).click();
  await page.waitForURL(/\/diaries\/[^/]+$/);

  await page.getByPlaceholder("标题").fill("Compare E2E");
  await page.getByPlaceholder("用 Markdown 记录今天...").fill("first line");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();

  await page.getByPlaceholder("用 Markdown 记录今天...").fill("first line\nsecond line");
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();

  await page.keyboard.press("Alt+H");
  const comparePanel = page.getByRole("region", { name: "版本对比面板" });
  await expect(comparePanel).toBeVisible();
  await expect(comparePanel.getByRole("heading", { name: "差异" })).toBeVisible();
  await expect(comparePanel.getByText("second line")).toBeVisible();

  await page.getByPlaceholder("用 Markdown 记录今天...").fill("first line\nsecond line\nunsaved line");
  await expect(page.getByText("对比基于已保存版本，未保存内容请先保存。")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "版本对比面板" })).not.toBeVisible();
});

async function createDiary(page: import("@playwright/test").Page, title: string, content: string) {
  await page.getByRole("button", { name: "新建日记" }).click();
  await page.waitForURL(/\/diaries\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "编辑" })).toBeVisible();
  await page.getByPlaceholder("标题").fill(title);
  await page.getByPlaceholder("用 Markdown 记录今天...").fill(content);
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText(/已保存/)).toBeVisible();
  await page.getByRole("link", { name: "列表" }).click();
}
