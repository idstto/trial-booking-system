import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const artifactRoot = path.resolve("artifacts/walkthrough");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const videoRoot = path.join(artifactRoot, "video");

test("records the trial-booking walkthrough", async ({ browser }, testInfo) => {
  await Promise.all([
    rm(screenshotRoot, { recursive: true, force: true }),
    rm(videoRoot, { recursive: true, force: true }),
  ]);
  await Promise.all([
    mkdir(screenshotRoot, { recursive: true }),
    mkdir(videoRoot, { recursive: true }),
  ]);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: testInfo.outputPath("recording"), size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trial class booking" })).toBeVisible();
  await expect(page.getByText("3 seats available")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Alya" })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(screenshotRoot, "01-initial-state.png"),
    fullPage: true,
  });

  await page.getByLabel("Child", { exact: true }).selectOption({ label: "Maya" });
  await page
    .getByLabel("Trial class", { exact: true })
    .selectOption({ label: "Creative Mathematics" });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByText("pending payment")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(screenshotRoot, "02-pending-booking.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await expect(page.getByText("confirmed", { exact: true })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Maya" })).toBeVisible();
  await expect(page.getByText("2 seats available")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(screenshotRoot, "03-confirmed-and-roster.png"),
    fullPage: true,
  });

  await page.getByLabel("Child", { exact: true }).selectOption({ label: "Noah" });
  await page
    .getByLabel("Trial class", { exact: true })
    .selectOption({ label: "Junior Science Lab" });
  await expect(page.getByText("1 seats available")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await page
    .getByLabel("Trial class", { exact: true })
    .selectOption({ label: "Creative Mathematics" });
  await expect(page.getByText("2 seats available")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByText("pending payment")).toBeVisible();
  await page.getByRole("button", { name: "Simulate failed payment" }).click();
  await expect(page.getByText("payment failed")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Noah" })).toHaveCount(0);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(screenshotRoot, "04-payment-failed.png"),
    fullPage: true,
  });

  await page.getByLabel("Child", { exact: true }).selectOption({ label: "Maya" });
  await page
    .getByLabel("Trial class", { exact: true })
    .selectOption({ label: "Junior Science Lab" });
  await expect(page.getByText("1 seats available")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await page
    .getByLabel("Trial class", { exact: true })
    .selectOption({ label: "Creative Mathematics" });
  await expect(page.getByText("2 seats available")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "This child already has an active booking for the class" }),
  ).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(screenshotRoot, "05-duplicate-protection.png"),
    fullPage: true,
  });

  await context.close();
  await video?.saveAs(path.join(videoRoot, "trial-booking-walkthrough.webm"));
});
