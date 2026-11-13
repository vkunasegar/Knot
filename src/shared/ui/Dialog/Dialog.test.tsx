// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("opens as a named modal dialog with its description", () => {
    render(
      <Dialog
        open
        title="Delete collection"
        description="Notes inside the collection are kept."
        onClose={() => {}}
      >
        <p>Confirm removal?</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete collection" });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveAccessibleDescription("Notes inside the collection are kept.");
  });

  it("closes via the header button and notifies onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog
          open={open}
          title="Export notes"
          onClose={() => {
            setOpen(false);
            onClose();
          }}
        >
          <p>Choose a folder.</p>
        </Dialog>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
