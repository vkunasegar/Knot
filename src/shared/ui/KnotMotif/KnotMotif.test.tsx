// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnotMotif } from "./KnotMotif";

describe("KnotMotif", () => {
  it("is hidden from assistive technology by default", () => {
    const { container } = render(<KnotMotif />);
    const svg = container.querySelector("svg")!;

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).not.toHaveAttribute("role");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("draws exactly one continuous thread", () => {
    for (const variant of ["mark", "flourish"] as const) {
      const { container, unmount } = render(<KnotMotif variant={variant} />);
      const paths = container.querySelectorAll("path");

      expect(paths).toHaveLength(1);
      // A single "M" command means one uninterrupted stroke without jumps.
      expect(paths[0].getAttribute("d")!.match(/M/g)).toHaveLength(1);
      unmount();
    }
  });

  it("contains nothing interactive", () => {
    const { container } = render(<KnotMotif variant="flourish" />);

    expect(container.querySelector("a, button, [tabindex]")).toBeNull();
  });

  it("becomes a named image only when a label is provided", () => {
    render(<KnotMotif label="KNOT" />);

    const image = screen.getByRole("img", { name: "KNOT" });
    expect(image).not.toHaveAttribute("aria-hidden");
  });

  it("applies variant and animation modifiers", () => {
    const { container } = render(<KnotMotif variant="flourish" animated className="extra" />);

    expect(container.querySelector("svg")).toHaveClass(
      "knot-motif",
      "knot-motif--flourish",
      "knot-motif--animated",
      "extra",
    );
  });
});
