import { expect, test } from "@playwright/test";

test("renders an honest desktop shell using only local resources", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin)
      remoteRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page).toHaveTitle("KNOT");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Home", level: 1 }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const name of [
    "Home",
    "All Notes",
    "Threads",
    "Collections",
    "Favorites",
    "Archive",
    "Settings",
  ]) {
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("status")).toContainText("No unsaved changes");
  await expect(page.getByText("Saved locally")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Enter Focus Mode" }),
  ).toHaveCount(0);
  await expect(page.locator('a[href*="design-preview"]')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test("captures the desktop shell and palette at design reference sizes", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("desktop-shell.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Search workspace" }).click();
  await expect(page.getByRole("combobox")).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("search-palette.png"),
    animations: "disabled",
  });
});
