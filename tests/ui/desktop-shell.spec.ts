import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const areas = [
  "Home",
  "All Notes",
  "Threads",
  "Collections",
  "Favorites",
  "Archive",
  "Settings",
];
const preferenceKey = "knot.shell.preferences.v1";

test("navigates all sections without a mouse and provides a skip link", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Home", level: 1 }),
  ).toBeFocused();
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  for (const name of areas.slice(1)) {
    const link = navigation.getByRole("link", { name, exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name, level: 1 })).toBeFocused();
    await expect(link).toHaveAttribute("aria-current", "page");
    expect(
      await page
        .getByRole("heading", { name, level: 1 })
        .evaluate((node) => getComputedStyle(node).outlineStyle),
    ).not.toBe("none");
  }
});

test("bounds history and discards forward history after a new destination", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Go back" })).toBeDisabled();
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(
    page.getByRole("heading", { name: "Home", level: 1 }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("link", { name: "All Notes", exact: true }).click();
  await nav.getByRole("link", { name: "Threads", exact: true }).click();
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(
    page.getByRole("heading", { name: "All Notes", level: 1 }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Go forward" }).click();
  await expect(
    page.getByRole("heading", { name: "Threads", level: 1 }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "All Notes", level: 1 }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("button", { name: "Go forward" })).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Archive", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Go back" })).toBeDisabled();
});

test("supports direct routes, unknown routes and external hash changes", async ({
  page,
}) => {
  await page.goto("/#/collections");
  await expect(
    page.getByRole("heading", { name: "Collections", level: 1 }),
  ).toBeVisible();
  await page.evaluate(() => {
    location.hash = "#/favorites";
  });
  await expect(
    page.getByRole("heading", { name: "Favorites", level: 1 }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Go back" }).click();
  await expect(
    page.getByRole("heading", { name: "Collections", level: 1 }),
  ).toBeVisible();
  await page.goto("/#/unknown");
  await expect(
    page.getByRole("heading", { name: "Home", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/home$/);
});

test("persists panel and sidebar preferences and restores focus on close", async ({
  page,
}) => {
  await page.goto("/");
  const main = page.getByRole("main");
  const before = await main.boundingBox();
  await page.getByRole("button", { name: "Close context panel" }).click();
  await expect(
    page.getByRole("button", { name: "Show context panel" }),
  ).toBeFocused();
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toBeHidden();
  expect((await main.boundingBox())!.width).toBeGreaterThan(before!.width);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.reload();
  await expect(page.locator(".desktop-shell")).toHaveAttribute(
    "data-sidebar-collapsed",
    "true",
  );
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Show context panel" }).click();
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toBeVisible();
});

test("keeps preference errors recoverable without claiming a document save", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "{broken");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("blocked", "QuotaExceededError");
      original.call(this, name, value);
    };
  }, preferenceKey);
  await page.goto("/");
  await expect(page.getByText(/preferences could not be loaded/)).toBeVisible();
  await page.getByRole("button", { name: "Hide context panel" }).click();
  await expect(page.getByText(/preferences could not be saved/)).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Show context panel" }).click();
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toBeVisible();
  await expect(page.getByText("Saved locally")).toHaveCount(0);
});

test("opens the palette with Ctrl and Cmd, filters actions and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Search workspace" });
  await trigger.focus();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search your workspace" });
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("arch");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Archive", level: 1 }),
  ).toBeFocused();
  await trigger.focus();
  await page.keyboard.press("Meta+k");
  await expect(input).toBeFocused();
  await input.fill("does not exist");
  await expect(dialog.getByRole("status")).toHaveText(
    "No matching sections or actions.",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await input.fill("context");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toBeHidden();
});

test("supports arrow navigation, modal focus containment and Escape", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search workspace" }).click();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("combobox");
  await page.keyboard.press("ArrowDown");
  await expect(
    dialog.getByRole("option", { name: /All Notes/ }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await page.keyboard.press("Home");
  await expect(dialog.getByRole("option", { name: /^Home/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
  }
  await input.focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("has no automated accessibility violations in expanded, compact, contrast and modal states", async ({
  page,
}) => {
  await page.goto("/");
  const check = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  };
  await check();
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await check();
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await check();
  await page.emulateMedia({ forcedColors: "none" });
  await page.getByRole("button", { name: "Search workspace" }).click();
  await check();
});

test("reflows at 1024 and minimum size without replacing content or preferences", async ({
  page,
}) => {
  await page.goto("/");
  const main = await page.getByRole("main").elementHandle();
  for (const width of [1024, 960]) {
    await page.setViewportSize({ width, height: 640 });
    await expect(page.locator(".desktop-shell")).toHaveAttribute(
      "data-sidebar-collapsed",
      "true",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Home", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hide context panel" }),
    ).toBeVisible();
    expect(
      await main!.evaluate((node) => node === document.querySelector("main")),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".desktop-shell")).toHaveAttribute(
    "data-sidebar-collapsed",
    "false",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), preferenceKey),
  ).toBeNull();
});

test("keeps enlarged text usable with reduced motion at minimum window size", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.setViewportSize({ width: 960, height: 640 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Home", level: 1 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Search workspace" }).click();
  await expect(page.getByRole("combobox")).toBeFocused();
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Settings", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
});
