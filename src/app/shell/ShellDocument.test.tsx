// @vitest-environment jsdom
import { useEffect, useRef, useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DesktopShell } from "./DesktopShell";
import { NavigationController } from "./NavigationController";
import { ShellPreferencesService } from "./ShellPreferencesService";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => vi.unstubAllGlobals());

it("preserves the same live document, selection and scroll through every layout change", async () => {
  const user = userEvent.setup();
  const mounts = vi.fn();
  const preferences = new ShellPreferencesService({
    read: () => null,
    write() {},
  });
  const navigation = new NavigationController(window);
  const editorRef = { current: null as HTMLTextAreaElement | null };
  function TestDocument() {
    const [value, setValue] = useState("A thought worth keeping");
    const ref = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
      mounts();
      editorRef.current = ref.current;
    }, []);
    return (
      <label>
        Document body
        <textarea
          ref={ref}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
    );
  }
  render(
    <DesktopShell
      navigation={navigation}
      preferences={preferences}
      document={{
        title: "Working thought",
        saveStatus: { state: "saving" },
        focusEditor: () => editorRef.current?.focus({ preventScroll: true }),
      }}
    >
      <TestDocument />
    </DesktopShell>,
  );
  const editor = screen.getByRole("textbox", {
    name: "Document body",
  }) as HTMLTextAreaElement;
  await user.type(editor, " — continued");
  editor.setSelectionRange(2, 9);
  editor.scrollTop = 27;
  const main = screen.getByRole("main");
  main.scrollTop = 45;
  await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  await user.click(screen.getByRole("button", { name: "Hide context panel" }));
  await user.click(screen.getByRole("button", { name: "Enter Focus Mode" }));
  expect(
    screen.queryByRole("navigation", { name: "Main navigation" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(editor).toHaveFocus();
  expect(screen.getByRole("textbox", { name: "Document body" })).toBe(editor);
  expect(editor.value).toBe("A thought worth keeping — continued");
  expect([
    editor.selectionStart,
    editor.selectionEnd,
    editor.scrollTop,
    main.scrollTop,
  ]).toEqual([2, 9, 27, 45]);
  expect(mounts).toHaveBeenCalledTimes(1);
  await user.keyboard("{Escape}");
  expect(editor).toHaveFocus();
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Show context panel" }),
  ).toBeVisible();
  expect(screen.getByText("Saving…")).toBeVisible();
  expect([editor.selectionStart, editor.selectionEnd]).toEqual([2, 9]);
  expect(preferences.getSnapshot()).toMatchObject({
    sidebarCollapsed: true,
    contextVisible: false,
  });
});

it("closes the palette before focusing the newly selected section", async () => {
  const user = userEvent.setup();
  render(
    <DesktopShell
      navigation={new NavigationController(window)}
      preferences={
        new ShellPreferencesService({ read: () => null, write() {} })
      }
    />,
  );
  const trigger = screen.getByRole("button", { name: "Search workspace" });
  await user.click(trigger);
  const input = screen.getByRole("combobox");
  await user.type(input, "arch");
  expect(screen.getAllByRole("option")).toHaveLength(1);
  await user.keyboard("{Enter}");
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Archive", level: 1 }),
    ).toHaveFocus(),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(trigger);
  await user.type(screen.getByRole("combobox"), "not-a-section");
  expect(screen.getByText("No matching sections or actions.")).toBeVisible();
  await user.keyboard("{ArrowDown}{Enter}");
  expect(screen.getByRole("dialog")).toBeVisible();
  await act(async () => {
    (screen.getByRole("dialog") as HTMLDialogElement).close();
  });
  await waitFor(() => expect(trigger).toHaveFocus());
});
