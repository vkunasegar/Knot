// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DesktopShell } from "./DesktopShell";
import { NavigationController } from "./NavigationController";
import { ShellPreferencesService } from "./ShellPreferencesService";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const preferences = new ShellPreferencesService({
    read: () => null,
    write: () => {},
  });
  const navigation = new NavigationController(window);
  render(<DesktopShell navigation={navigation} preferences={preferences} />);
  return { preferences, navigation, user: userEvent.setup() };
}

it("navigates by keyboard and moves focus into the destination", async () => {
  const { user } = setup();
  const link = screen.getByRole("link", { name: "All Notes" });
  link.focus();
  await user.keyboard("{Enter}");
  expect(
    screen.getByRole("heading", { name: "All Notes", level: 1 }),
  ).toHaveFocus();
  expect(link).toHaveAttribute("aria-current", "page");
  expect(
    screen.queryByRole("button", { name: "Enter Focus Mode" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("No unsaved changes");
  expect(screen.queryByText("Saved locally")).not.toBeInTheDocument();
});

it("restores focus when closing the inspector and retains the main node", async () => {
  const { user } = setup();
  const main = screen.getByRole("main");
  await user.click(screen.getByRole("button", { name: "Close context panel" }));
  expect(
    screen.getByRole("button", { name: "Show context panel" }),
  ).toHaveFocus();
  expect(
    screen.queryByRole("complementary", { name: "Context panel" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("main")).toBe(main);
  await user.click(screen.getByRole("button", { name: "Show context panel" }));
  expect(
    screen.getByRole("complementary", { name: "Context panel" }),
  ).toBeVisible();
});

it("keeps layout controls usable after persistence failure", async () => {
  const preferences = new ShellPreferencesService({
    read: () => null,
    write: () => {
      throw new Error("quota");
    },
  });
  render(
    <DesktopShell
      navigation={new NavigationController(window)}
      preferences={preferences}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(preferences.getSnapshot().sidebarCollapsed).toBe(true);
  expect(screen.getByText(/could not be saved/)).toHaveAttribute(
    "role",
    "status",
  );
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeEnabled();
});

it("uses temporary compact layout without modifying stored preference", () => {
  const handlers = new Set<() => void>();
  const media = {
    matches: false,
    addEventListener: (_: string, fn: () => void) => handlers.add(fn),
    removeEventListener: (_: string, fn: () => void) => handlers.delete(fn),
  };
  vi.stubGlobal("matchMedia", () => media);
  const { preferences } = setup();
  act(() => {
    media.matches = true;
    handlers.forEach((fn) => fn());
  });
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeDisabled();
  expect(preferences.getSnapshot().sidebarCollapsed).toBe(false);
  act(() => {
    media.matches = false;
    handlers.forEach((fn) => fn());
  });
  expect(
    screen.getByRole("button", { name: "Collapse sidebar" }),
  ).toBeEnabled();
});
