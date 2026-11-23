import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const host = "/tests/ui/fixtures/notes.html";
const firstNote = /A thought worth keeping.*Created/;
const bodyBox = (page: Page) =>
  page.getByRole("textbox", { name: "Note body" });
async function open(page: Page, rich = false) {
  await page.goto(`${host}#/notes`);
  await expect(page.getByRole("link", { name: firstNote })).toBeVisible();
  if (rich) {
    await page.evaluate(() =>
      window.knotNotesTest.replaceBody(window.knotNotesTest.richBody),
    );
    await page.getByRole("button", { name: "Refresh notes" }).click();
  }
  await page.getByRole("link", { name: firstNote }).click();
  await expect(bodyBox(page)).toBeVisible();
}

/** Select through the DOM, then exercise only public keyboard/button behavior. */
async function select(page: Page, text: string) {
  await bodyBox(page).focus();
  await bodyBox(page).evaluate((element, phrase) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const index = node.textContent!.indexOf(phrase);
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + phrase.length);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    throw new Error(`Missing phrase: ${phrase}`);
  }, text);
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe(text);
}
const checkA11y = async (page: Page) =>
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

test("round-trips mixed formatting, task state and metadata through save and reload", async ({
  page,
}) => {
  await open(page, true);
  const body = bodyBox(page);
  await expect(body.locator("h2")).toHaveText("Threads worth following");
  await expect(body.locator("strong")).toHaveText("important thoughts");
  await expect(body.locator("em")).toHaveCSS("font-style", "italic");
  expect(
    await page.evaluate(async () =>
      (await document.fonts.load('italic 16px "Inter Variable"')).some(
        (font) => font.style === "italic",
      ),
    ),
  ).toBe(true);
  await expect(body.locator("ol")).toHaveAttribute("start", "3");
  await expect(body.locator("pre code")).toContainText("const thought");
  await expect(page.getByLabel("Thread membership")).toContainText(
    "Everyday discoveries",
  );
  await select(page, "small discoveries");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("small discoveries");
  const task = body.getByRole("checkbox", { name: "Incomplete task" });
  await task.focus();
  await task.press("Space");
  await body.focus();
  await body.press("Control+s");
  await expect(page.getByText("Saved locally")).toBeVisible();
  const saved = await page.evaluate(
    async () => (await window.knotNotesTest.list())[0].body,
  );
  expect(saved.futureMetadata).toEqual({ keep: true });
  await page.reload();
  await expect(body.locator("strong")).toHaveCount(2);
  await expect(body.getByRole("checkbox", { checked: true })).toHaveCount(2);
  expect(
    await page.evaluate(
      async () => (await window.knotNotesTest.list())[0].body,
    ),
  ).toEqual(saved);
  await checkA11y(page);
});

test("keeps selection and undo/redo across saving, toolbar and Focus Mode", async ({
  page,
}) => {
  await open(page);
  const body = bodyBox(page);
  const original = await body.elementHandle();
  await select(page, "Every thought");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await body.press("Meta+s");
  await expect(page.getByText("Saved locally")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("Every thought");
  await page.getByRole("button", { name: "Undo text change" }).click();
  await expect(body.locator("strong")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("Every thought");
  await page.getByRole("button", { name: "Redo text change" }).click();
  await expect(body.locator("strong")).toHaveText("Every thought");
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("Every thought");
  await page.getByRole("button", { name: "Enter Focus Mode" }).click();
  await expect(body).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("Every thought");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Hide context panel" }).click();
  expect(
    await original!.evaluate(
      (node) => node === document.querySelector('[aria-label="Note body"]'),
    ),
  ).toBe(true);
  await body.focus();
  await body.press("ArrowRight");
  const cursor = await page.evaluate(() => getSelection()?.anchorOffset);
  await page.keyboard.type(" arrives");
  await body.press("Control+z");
  await expect(body).not.toContainText("arrives");
  expect(await page.evaluate(() => getSelection()?.anchorOffset)).toBe(cursor);
  await body.press("Control+Shift+z");
  await expect(body).toContainText("arrives");
});

test("supports Markdown input rules and keyboard formatting", async ({
  page,
}) => {
  await open(page);
  const body = bodyBox(page);
  for (const [prefix, selector] of [
    ["## ", "h2"],
    ["- ", "ul:not([data-type])"],
    ["1. ", "ol"],
    ["[ ] ", 'ul[data-type="taskList"]'],
    ["``` ", "pre"],
  ]) {
    await body.focus();
    await body.press("Control+a");
    await body.press("Backspace");
    await page.keyboard.type(prefix + "A thought");
    await expect(body.locator(selector)).toContainText("A thought");
    // A fresh document also verifies discard cannot be undone into abandoned text.
    await page.getByRole("button", { name: "Discard body changes" }).click();
    await expect(body).toHaveText("Every thought is a thread.");
    await expect(
      page.getByRole("button", { name: "Undo text change" }),
    ).toBeDisabled();
  }
  await select(page, "Every thought");
  await body.press("Control+b");
  await expect(body.locator("strong")).toHaveText("Every thought");
  await body.press("Control+i");
  await expect(body.locator("em")).toHaveText("Every thought");
});

test("edits links with keyboard access, safe URLs, modal focus and selection restoration", async ({
  page,
}) => {
  await open(page);
  await select(page, "Every thought");
  await page.getByRole("button", { name: "Edit link", exact: true }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Edit link" });
  const address = dialog.getByRole("textbox", { name: "Link address" });
  await expect(address).toBeFocused();
  await address.fill("javascript:alert(1)");
  await address.press("Enter");
  await expect(address).toHaveAttribute("aria-invalid", "true");
  await checkA11y(page);
  await address.fill("https://example.com/source");
  await address.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(bodyBox(page)).toBeFocused();
  await expect(bodyBox(page).getByRole("link")).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("Every thought");
  await page.getByRole("button", { name: "Edit link", exact: true }).click();
  await expect(address).toHaveValue("https://example.com/source");
  await page.keyboard.press("Escape");
  await expect(bodyBox(page)).toBeFocused();
  await page.getByRole("button", { name: "Edit link", exact: true }).click();
  await address.fill("");
  await address.press("Enter");
  await expect(bodyBox(page).getByRole("link")).toHaveCount(0);
  await page.getByRole("button", { name: "Enter Focus Mode" }).click();
  await page.getByRole("button", { name: "Edit link", exact: true }).click();
  await expect(address).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Exit Focus Mode" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Enter Focus Mode" }),
  ).toBeVisible();
});

test("retains unsaved bodies through errors and navigation, and never reports a dirty body as saved", async ({
  page,
}) => {
  await open(page);
  const body = bodyBox(page);
  await body.fill("A local draft to preserve");
  await page.evaluate(() => window.knotNotesTest.failNextWrite("busy"));
  await page.getByRole("button", { name: "Save body", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Storage is busy" }),
  ).toContainText("Storage is busy");
  await expect(page.getByText("Saved locally")).toHaveCount(0);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: "All Notes", exact: true }).click();
  await page.getByRole("link", { name: firstNote }).click();
  await expect(body).toHaveText("A local draft to preserve");
  await page.getByRole("button", { name: "Add favorite", exact: true }).click();
  await expect(page.getByText("Saved locally")).toHaveCount(0);
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save body", exact: true }).click();
  await expect(page.getByText("Saved locally")).toBeVisible();
  await page.reload();
  await expect(body).toHaveText("A local draft to preserve");
});

test("protects external edits and unsupported document data", async ({
  page,
}) => {
  await open(page);
  const body = bodyBox(page);
  await body.fill("Local changes");
  await page.evaluate(() =>
    window.knotNotesTest.replaceBody(window.knotNotesTest.richBody),
  );
  await page.getByRole("button", { name: "Save body", exact: true }).click();
  await expect(
    page.getByText("The stored body changed elsewhere.", { exact: false }),
  ).toBeVisible();
  await expect(body).toHaveText("Local changes");
  await expect(
    page.getByRole("button", { name: "Save body", exact: true }),
  ).toBeDisabled();
  await page.getByText("Stored body preview").click();
  await expect(
    page
      .locator("details")
      .filter({ has: page.getByText("Stored body preview", { exact: true }) }),
  ).toContainText("Threads worth following");
  await page.getByRole("button", { name: "Discard body changes" }).click();
  await expect(body.locator("h2")).toHaveText("Threads worth following");
  await page.evaluate(() =>
    window.knotNotesTest.replaceBody({
      version: 1,
      document: {
        type: "doc",
        content: [
          {
            type: "futureNode",
            content: [{ type: "text", text: "Preserve this future format" }],
          },
        ],
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByText(/formatting this version cannot edit safely/),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Note content" }),
  ).toContainText("Preserve this future format");
  await expect(body).toHaveCount(0);
  await page.getByRole("button", { name: "Add favorite", exact: true }).click();
  expect(
    await page.evaluate(
      async () => (await window.knotNotesTest.list())[0].body.document.content,
    ),
  ).toEqual([
    {
      type: "futureNode",
      content: [{ type: "text", text: "Preserve this future format" }],
    },
  ]);
});

test("checks empty, mixed and long editor layouts, reduced motion and responsive accessibility", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, true);
  await page.evaluate(() => document.fonts.ready);
  await checkA11y(page);
  await page.screenshot({
    path: testInfo.outputPath("editor-mixed.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Enter Focus Mode" }).click();
  await page.screenshot({
    path: testInfo.outputPath("editor-focus.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await bodyBox(page).fill(
    "A long thought with space for details. 🧶 ".repeat(500),
  );
  for (const width of [1024, 960, 640]) {
    await page.setViewportSize({ width, height: 700 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await checkA11y(page);
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
  await checkA11y(page);
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Discard body changes" }).click();
  await page.getByRole("button", { name: "New note", exact: true }).click();
  await expect(bodyBox(page)).toHaveText("");
  await expect(
    page.getByText("Every thought begins with a thread…"),
  ).toBeVisible();
  await checkA11y(page);
  await page.setViewportSize(testInfo.project.use.viewport!);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.emulateMedia({ forcedColors: "none" });
  await page.screenshot({
    path: testInfo.outputPath("editor-empty.png"),
    animations: "disabled",
  });
});
