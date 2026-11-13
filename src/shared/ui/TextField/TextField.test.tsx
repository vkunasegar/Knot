// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates the label with the input and accepts typing", async () => {
    const user = userEvent.setup();
    render(<TextField label="Note title" placeholder="Untitled" />);

    const input = screen.getByLabelText("Note title");
    expect(input).not.toHaveAttribute("aria-invalid");

    await user.type(input, "Architecture notes");
    expect(input).toHaveValue("Architecture notes");
  });

  it("wires hint and error messages into the accessible description", () => {
    render(
      <TextField
        label="Collection name"
        hint="Shown in the sidebar."
        error="Enter at least one character."
      />,
    );

    const input = screen.getByLabelText("Collection name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter at least one character. Shown in the sidebar.");
  });

  it("supports a disabled state", () => {
    render(<TextField label="Read-only path" defaultValue="/notes" disabled />);

    expect(screen.getByLabelText("Read-only path")).toBeDisabled();
  });
});
