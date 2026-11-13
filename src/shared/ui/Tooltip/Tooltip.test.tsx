// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("opens on keyboard focus and dismisses with Escape without losing focus", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Search (Ctrl+K)">
        <button type="button">Search</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Search" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("tooltip", { name: "Search (Ctrl+K)" })).toBeVisible();
    expect(trigger).toHaveAccessibleDescription("Search (Ctrl+K)");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens on hover and closes when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Toggle focus mode">
        <button type="button">Focus</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Focus" });
    await user.hover(trigger);
    expect(screen.getByRole("tooltip", { name: "Toggle focus mode" })).toBeVisible();

    await user.unhover(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
