// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaveStatus } from "./SaveStatus";

describe("SaveStatus", () => {
  it.each([
    ["idle", "No unsaved changes"],
    ["saving", "Saving…"],
    ["saved", "Saved locally"],
  ] as const)("announces the %s state via a status live region", (state, expectedText) => {
    render(<SaveStatus state={state} />);

    expect(screen.getByRole("status")).toHaveTextContent(expectedText);
  });

  it("escalates write failures to an alert with the error detail", () => {
    render(<SaveStatus state="error" detail="Disk is full" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Save failed");
    expect(alert).toHaveTextContent("Disk is full");
  });
});
