// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("exposes a region named after its heading", () => {
    render(
      <Panel title="Connections" subtitle="2 linked notes" actions={<button type="button">Add</button>}>
        <p>Body content</p>
      </Panel>,
    );

    const region = screen.getByRole("region", { name: "Connections" });
    expect(region).toHaveClass("knot-panel", "knot-panel--elevation-1");
    expect(screen.getByRole("heading", { name: "Connections", level: 2 })).toBeVisible();
    expect(screen.getByText("2 linked notes")).toBeVisible();
    expect(screen.getByRole("button", { name: "Add" })).toBeVisible();
  });

  it("supports custom heading levels and elevation", () => {
    render(
      <Panel title="Details" headingLevel="h3" elevation={2}>
        Content
      </Panel>,
    );

    expect(screen.getByRole("heading", { name: "Details", level: 3 })).toBeVisible();
    expect(screen.getByRole("region", { name: "Details" })).toHaveClass("knot-panel--elevation-2");
  });
});
