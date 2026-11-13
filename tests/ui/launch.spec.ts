import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders accessible launch content using only local resources", async ({ page, baseURL }) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin) {
      remoteRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page).toHaveTitle("KNOT");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("main")).toMatchAriaSnapshot(`
    - main:
      - heading "KNOT" [level=1]
      - paragraph: Every thought is a thread. Every connection creates meaning.
  `);
  await expect(page.getByRole("heading", { name: "KNOT", level: 1 })).toBeVisible();
  await expect(page.locator('a[href*="design-preview"]')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test("has no automated WCAG A/AA accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KNOT" })).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("keeps enlarged text visible with reduced motion at the minimum window size", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const heading = page.getByRole("heading", { name: "KNOT" });
  await expect(heading).toBeVisible();
  const originalSize = await heading.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await page.setViewportSize({ width: 960, height: 640 });

  const enlargedSize = await heading.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(enlargedSize).toBeGreaterThanOrEqual(originalSize * 2);
  for (const content of [heading, page.getByRole("main").locator("p")]) {
    const bounds = await content.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(960);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
});

test("captures the launch screen at the design reference size", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "KNOT" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("launch.png"), animations: "disabled" });
});
