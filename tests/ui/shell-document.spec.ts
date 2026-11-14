import { expect, test } from "@playwright/test";

test("keeps a live document and cursor through reflow, native modal use and Focus Mode", async ({
  page,
}) => {
  await page.goto("/tests/ui/fixtures/document.html");
  const editor = page.getByRole("textbox", { name: "Document body" });
  await editor.fill("Edited thought\n".repeat(100));
  const element = await editor.elementHandle();
  await editor.evaluate((node: HTMLTextAreaElement) => {
    node.setSelectionRange(2, 9);
    node.scrollTop = 40;
  });
  await page.getByRole("main").evaluate((node) => {
    node.scrollTop = 120;
  });
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.getByRole("button", { name: "Hide context panel" }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole("button", { name: "Enter Focus Mode" }).click();
  await expect(editor).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeHidden();
  await expect(page.getByRole("banner")).toBeHidden();
  expect(
    await element!.evaluate(
      (node) => node === document.querySelector("textarea"),
    ),
  ).toBe(true);
  expect(
    await editor.evaluate((node: HTMLTextAreaElement) => [
      node.selectionStart,
      node.selectionEnd,
      node.scrollTop,
    ]),
  ).toEqual([2, 9, 40]);
  expect(await page.getByRole("main").evaluate((node) => node.scrollTop)).toBe(
    120,
  );
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("combobox")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Exit Focus Mode" }),
  ).toBeVisible();
  await expect(editor).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(
    page.getByRole("complementary", { name: "Context panel" }),
  ).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeEnabled();
  expect(
    await editor.evaluate((node: HTMLTextAreaElement) => [
      node.selectionStart,
      node.selectionEnd,
    ]),
  ).toEqual([2, 9]);
  await expect(editor).toHaveValue("Edited thought\n".repeat(100));
  await expect(page.getByRole("status")).toHaveText("Saving…");
});
