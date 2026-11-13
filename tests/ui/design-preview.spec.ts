import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PREVIEW_PATH = "/design-preview.html";

test("renders every design system section using only local resources", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin) {
      remoteRequests.push(request.url());
    }
  });

  await page.goto(PREVIEW_PATH);
  await expect(page).toHaveTitle("KNOT — Design system preview");
  await expect(page.getByRole("heading", { name: "KNOT Visual Foundation", level: 1 })).toBeVisible();

  for (const section of [
    "Color tokens",
    "Typography scale",
    "Spacing, radii & thread motif",
    "Buttons & tooltips",
    "Text fields",
    "Note chips & modal dialog",
    "Save status & messages",
  ]) {
    await expect(page.getByRole("region", { name: section })).toBeVisible();
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test("has no automated WCAG A/AA violations in default, more-contrast and dialog states", async ({
  page,
}) => {
  await page.goto(PREVIEW_PATH);
  await expect(page.getByRole("heading", { name: "KNOT Visual Foundation" })).toBeVisible();

  const defaultResult = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(defaultResult.violations).toEqual([]);

  await page.getByRole("button", { name: "More contrast" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-knot-contrast", "more");
  const contrastResult = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(contrastResult.violations).toEqual([]);

  await page.getByRole("button", { name: "Open confirmation dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete collection?" });
  await expect(dialog).toBeVisible();
  const dialogResult = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dialogResult.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("makes keyboard focus clearly distinct from hover", async ({ page }) => {
  await page.goto(PREVIEW_PATH);
  const button = page.getByRole("button", { name: "Secondary" });

  await button.hover();
  await expect(button).toHaveCSS("border-color", "rgb(198, 107, 84)");
  const hoverShadow = await button.evaluate((el) => getComputedStyle(el).boxShadow);

  await page.mouse.move(0, 0);
  await button.focus();
  // Dispatch a keyboard event so the browser activates :focus-visible.
  await page.keyboard.press("Shift");
  const focusShadow = await button.evaluate((el) => getComputedStyle(el).boxShadow);

  expect(focusShadow).not.toBe("none");
  expect(focusShadow).not.toBe(hoverShadow);
  // Focus ring uses ink blue (rgb(64, 91, 114)), whereas hover shifts the border to terracotta.
  expect(focusShadow).toContain("rgb(64, 91, 114)");
});

test("keeps decorative thread motifs non-interactive and separate from note chips", async ({
  page,
}) => {
  await page.goto(PREVIEW_PATH);

  const motifs = page.locator(".knot-motif");
  expect(await motifs.count()).toBeGreaterThanOrEqual(2);
  for (const motif of await motifs.all()) {
    await expect(motif).toHaveAttribute("aria-hidden", "true");
    expect(await motif.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  }

  // No decorative motif may sit inside the note-chip panel, where a thread
  // line could be misread as a stored semantic link between notes.
  const chipPanel = page.getByRole("region", { name: "Note chips & modal dialog" });
  await expect(chipPanel.locator(".knot-motif")).toHaveCount(0);
});

test("disables animations and hover translation when reduced motion is active", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PREVIEW_PATH);

  const button = page.getByRole("button", { name: "Primary action" });
  await button.hover();
  const transform = await button.evaluate((el) => getComputedStyle(el).transform);
  expect(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);

  const runningAnimations = await page.evaluate(
    () => document.getAnimations().filter((animation) => animation.playState === "running").length,
  );
  expect(runningAnimations).toBe(0);
});

test("captures the design preview at the reference viewport size", async ({ page }, testInfo) => {
  await page.goto(PREVIEW_PATH);
  await expect(page.getByRole("heading", { name: "KNOT Visual Foundation" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath("design-preview.png"),
    animations: "disabled",
  });
});
