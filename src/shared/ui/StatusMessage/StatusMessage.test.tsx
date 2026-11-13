// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusMessage } from "./StatusMessage";

describe("StatusMessage", () => {
  it("uses a polite status role for non-error tones", () => {
    render(
      <StatusMessage tone="success" title="Note archived" action={<button type="button">Undo</button>}>
        Moved to the archive.
      </StatusMessage>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Note archived");
    expect(status).toHaveTextContent("Moved to the archive.");
    expect(screen.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  it("uses an alert role for error messages", () => {
    render(<StatusMessage tone="error" title="Could not write to database" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not write to database");
  });
});
