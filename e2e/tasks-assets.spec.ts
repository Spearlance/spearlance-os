import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Scope: ABC Company test client on the dev project ONLY.
const ABC = "00000000-0000-0000-0000-0000000000c1";
const BOARD = `/tasks?client=${ABC}`;

// 1x1 transparent PNG — written to fixtures for the upload test.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function fixturePng(name: string): string {
  const dir = path.join("e2e", "fixtures");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, Buffer.from(PNG_BASE64, "base64"));
  return file;
}

test.describe("Task board + related assets (dev / ABC Company)", () => {
  test("board renders seeded tasks and they persist (no flash-then-blank)", async ({ page }) => {
    await page.goto(BOARD);

    const card = page.getByText("E2E Draft homepage copy", { exact: false });
    await expect(card).toBeVisible({ timeout: 25_000 });

    // The bug was: cards appear, then blank out until a manual refresh. Assert the
    // card is STILL there after a sustained wait, with no reload.
    await page.waitForTimeout(3500);
    await expect(card).toBeVisible();
    await expect(page.getByText("E2E Build hero section", { exact: false })).toBeVisible();
    await expect(page.getByText("Loading tasks")).toHaveCount(0);
  });

  test("Link Assets dialog supports upload + multi-select and links them", async ({ page }) => {
    await page.goto(BOARD);

    // Open a task drawer.
    const card = page.getByText("E2E Review brand palette", { exact: false });
    await expect(card).toBeVisible({ timeout: 25_000 });
    await card.click();

    // Go to the Related tab and open the Link Assets dialog.
    await page.getByRole("tab", { name: "Related" }).click();
    await page.getByRole("button", { name: "Link Assets" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Link Assets to Task")).toBeVisible();
    // Multi-select grid shows existing assets; upload zone present; nothing selected yet.
    await expect(dialog.getByRole("button", { name: "Upload new asset" })).toBeVisible();
    await expect(dialog.getByText("E2E Seed Asset", { exact: false })).toBeVisible();
    await expect(dialog.getByText("0 selected")).toBeVisible();

    // Upload two fresh files -> both auto-select (proves upload + multi-select).
    // Unique per-run names keep the assertions strict-mode safe across reruns.
    const run = Date.now().toString(36);
    const nameA = `e2e-up-${run}-a`;
    const nameB = `e2e-up-${run}-b`;
    const f1 = fixturePng(`${nameA}.png`);
    const f2 = fixturePng(`${nameB}.png`);
    await dialog.locator('input[type="file"]').setInputFiles([f1, f2]);

    await expect(dialog.getByText("2 selected")).toBeVisible({ timeout: 25_000 });
    const linkBtn = dialog.getByRole("button", { name: /Link 2 assets/ });
    await expect(linkBtn).toBeEnabled();
    await linkBtn.click();

    // Dialog closes; the two uploaded assets now show under Related Assets.
    await expect(page.getByText("Link Assets to Task")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText(nameA, { exact: false })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(nameB, { exact: false })).toBeVisible();
  });
});
