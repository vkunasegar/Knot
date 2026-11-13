import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the contrast promises documented in tokens.css. The test reads the
 * real stylesheet, so changing a color token without keeping it accessible
 * fails here instead of in a later visual review.
 */

const tokensPath = fileURLToPath(new URL("../src/shared/styles/tokens.css", import.meta.url));
const css = readFileSync(tokensPath, "utf8");

/** Extracts the default (first) hex value declared for a custom property. */
function token(name: string): string {
  const match = css.match(new RegExp(`--knot-color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) {
    throw new Error(`Token --knot-color-${name} is missing or not a 6-digit hex value`);
  }
  return match[1];
}

/** Relative luminance as defined by WCAG 2.1. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1 to 21). */
function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// WCAG AA minimum for normal-size text and for UI component boundaries.
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe("design token contrast", () => {
  const backgrounds = ["canvas", "surface"];

  it.each(["text", "text-secondary", "thread-strong", "ink", "error", "success", "warning"])(
    "%s is readable as small text on canvas and surface",
    (foreground) => {
      for (const background of backgrounds) {
        expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(AA_TEXT);
      }
    },
  );

  it("keeps the signature thread color usable for lines and large elements", () => {
    for (const background of backgrounds) {
      expect(contrast(token("thread"), token(background))).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });

  it("keeps text on filled primary controls readable", () => {
    expect(contrast(token("text-on-accent"), token("thread-strong"))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("keeps state colors readable on their own tinted backgrounds", () => {
    for (const state of ["error", "success", "warning"]) {
      expect(contrast(token(state), token(`${state}-tint`))).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("keeps the focus color distinguishable from surfaces", () => {
    expect(contrast(token("ink"), token("surface"))).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
