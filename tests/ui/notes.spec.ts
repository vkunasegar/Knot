import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const host = "/tests/ui/fixtures/notes.html";
const firstNote = /A thought worth keeping.*Created/;

test("creates with Ctrl/Cmd+N and the palette, saves a title and reopens after reload", async ({
  page,
}) => {
  await page.goto(`${host}#/notes`);
  await expect(page.getByRole("link", { name: firstNote })).toBeVisible();
  await page.keyboard.press("Control+n");
  const title = page.getByRole("textbox", { name: "Title" });
  await expect(title).toBeFocused();
  await title.fill("Ein neuer Faden 🧶");
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await title.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Ein neuer Faden 🧶", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Saved locally")).toBeVisible();
  await expect(title).toBeFocused();
  await page.reload();
  await expect(title).toHaveValue("Ein neuer Faden 🧶");
  await page.keyboard.press("Meta+n");
  await expect(title).toHaveValue("");
  await page
    .getByRole("button", { name: "Search workspace", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").fill("New note");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(title).toBeFocused();
  expect(
    await page.evaluate(async () => (await window.knotNotesTest.list()).length),
  ).toBe(5);
});

test("retains title input on write errors and reconciles lost acknowledgements", async ({
  page,
}) => {
  await page.goto(`${host}#/notes`);
  await page.getByRole("link", { name: firstNote }).click();
  const title = page.getByRole("textbox", { name: "Title" });
  await title.fill("Still here after failure");
  await page.evaluate(() => window.knotNotesTest.failNextWrite("busy"));
  await page.getByRole("button", { name: "Save title", exact: true }).click();
  await expect(page.getByText(/Storage is busy/)).toBeVisible();
  await expect(title).toHaveValue("Still here after failure");
  await expect(page.getByText("Saved locally")).toHaveCount(0);
  await page.getByRole("button", { name: "Save title", exact: true }).click();
  await expect(page.getByText("Saved locally")).toBeVisible();
  await page.evaluate(() => window.knotNotesTest.loseAcknowledgement());
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.getByText(/Storage could not confirm/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Duplicate", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reload library", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back to All Notes", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /Still here after failure \(copy\)/ }),
  ).toHaveCount(1);
  expect(
    await page.evaluate(async () => (await window.knotNotesTest.list()).length),
  ).toBe(3);
});

test("filters favorites and archive, recovers trash after reload and undoes archive", async ({
  page,
}) => {
  await page.goto(`${host}#/notes`);
  await page.getByRole("link", { name: firstNote }).click();
  await page.getByRole("button", { name: "Add favorite", exact: true }).click();
  await page.getByRole("button", { name: "Archive note", exact: true }).click();
  await page.getByRole("link", { name: "Favorites", exact: true }).click();
  await expect(page.getByRole("link", { name: firstNote })).toHaveCount(0);
  await page.getByRole("link", { name: "Archive", exact: true }).click();
  await page.getByRole("link", { name: firstNote }).click();
  await page
    .getByRole("button", { name: "Move to trash", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore note", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to Trash", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Trash", level: 1 }),
  ).toBeVisible();
  await page.getByRole("link", { name: firstNote }).click();
  await page.getByRole("button", { name: "Restore note", exact: true }).click();
  await expect(
    page.getByText("This note is archived and hidden from active lists."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore from archive", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByText("This note is archived and hidden from active lists."),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Note content" }),
  ).toContainText("Every thought is a thread.");
});

test("preserves focus, draft and content through layout and Focus Mode", async ({
  page,
}) => {
  await page.goto(`${host}#/notes`);
  await page.getByRole("link", { name: firstNote }).click();
  const title = page.getByRole("textbox", { name: "Title" });
  await title.fill("A draft to preserve");
  const content = await page
    .getByRole("region", { name: "Note content" })
    .elementHandle();
  await page.getByRole("button", { name: "Enter Focus Mode" }).click();
  await expect(
    page.getByRole("region", { name: "Note content" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Hide context panel" }).click();
  expect(
    await content!.evaluate(
      (node) => node === document.querySelector(".notes-document"),
    ),
  ).toBe(true);
  await expect(title).toHaveValue("A draft to preserve");
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(
    page.getByRole("heading", { name: "All Notes", level: 1 }),
  ).toBeFocused();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(title).toHaveValue("A draft to preserve");
});

test("supports long titles, keyboard sorting, responsive layout and reduced motion without accessibility violations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${host}#/notes`);
  const check = async () =>
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  await expect(page.getByRole("link", { name: firstNote })).toBeVisible();
  await check();
  await page
    .getByRole("combobox", { name: "Sort notes" })
    .selectOption("title");
  await page.getByRole("link", { name: firstNote }).focus();
  await page.keyboard.press("Enter");
  const title = page.getByRole("textbox", { name: "Title" });
  await title.fill("Ein sehr langer Gedanke 🧶 ".repeat(100));
  await title.press("Enter");
  await expect(page.getByText("Saved locally")).toBeVisible();
  await check();
  await page
    .getByRole("button", { name: "Move to trash", exact: true })
    .click();
  await check();
  await page
    .getByRole("button", { name: "Back to Trash", exact: true })
    .click();
  for (const width of [1024, 960]) {
    await page.setViewportSize({ width, height: 640 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await check();
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ forcedColors: "active" });
  await check();
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
});

test("captures notes and recovery at design reference sizes", async ({
  page,
}, testInfo) => {
  await page.goto(`${host}#/notes`);
  await expect(page.getByRole("link", { name: firstNote })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("all-notes.png"),
    animations: "disabled",
  });
  await page.getByRole("link", { name: firstNote }).click();
  await page.screenshot({
    path: testInfo.outputPath("note-detail.png"),
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Move to trash", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("note-recovery.png"),
    animations: "disabled",
  });
});
