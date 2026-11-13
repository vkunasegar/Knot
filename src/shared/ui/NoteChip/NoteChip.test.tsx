// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NoteChip } from "./NoteChip";

describe("NoteChip", () => {
  it("renders a non-interactive span when no onSelect handler is given", () => {
    render(<NoteChip title="Local-first principles" meta="#1" />);

    expect(screen.getByText("Local-first principles")).toBeVisible();
    expect(screen.getByText("#1")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders an accessible toggle button when interactive", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<NoteChip title="Graph layout notes" selected onSelect={onSelect} />);

    const button = screen.getByRole("button", { name: "Graph layout notes" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
