import type { SVGProps } from "react";
import { cx } from "../cx";
import "./KnotMotif.css";

/**
 * Path data for the KNOT motif.
 *
 * Each variant is ONE continuous, open stroke: a thread enters from the left,
 * ties a single off-center loop that crosses itself once, and leaves on the
 * right at a different height. The asymmetry is intentional; the motif should
 * read as a hand-tied thread, not as a geometric logo or a network diagram.
 *
 * - `mark`: compact square version for small placements (headers, empty states).
 * - `flourish`: wide version for section dividers and title accents.
 */
const MOTIF_PATHS = {
  mark: {
    viewBox: "0 0 48 48",
    d: "M5 39 C13 39 19 35 23 29 C29 19 33 9 26 8 C18 7 16 19 24 27 C30 33 37 35 43 30",
  },
  flourish: {
    viewBox: "0 0 240 48",
    d: "M4 34 C40 34 80 31 118 30 C150 29 168 22 168 14 C168 6 156 4 148 8 C138 13 140 30 160 36 C182 42 210 38 236 26",
  },
} as const;

export type KnotMotifVariant = keyof typeof MOTIF_PATHS;

export interface KnotMotifProps
  extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "role"> {
  /** Shape of the motif. Defaults to the compact `mark`. */
  variant?: KnotMotifVariant;
  /**
   * Accessible name. Omit it for decorative use (the default), which hides the
   * SVG from assistive technology. Only pass a label when the motif itself
   * carries meaning, e.g. as the brand mark next to no other text.
   */
  label?: string;
  /** Draws the thread in once on mount. Disabled automatically for reduced motion. */
  animated?: boolean;
}

/**
 * The KNOT thread motif.
 *
 * Decoration rules (see docs/design/knot/README.md):
 * - The motif is a standalone ornament. It deliberately has no `source` or
 *   `target` props and must never be stretched between notes, chips or cards,
 *   because thread lines in KNOT encode real relationships.
 * - It is purely visual by default: hidden from screen readers, not focusable
 *   and transparent to pointer events, so it can never be mistaken for an
 *   interactive link.
 * - The color follows `currentColor` and defaults to the signature thread
 *   token; set `color` on a parent to adapt it.
 */
export function KnotMotif({
  variant = "mark",
  label,
  animated = false,
  className,
  ...svgProps
}: KnotMotifProps) {
  const { viewBox, d } = MOTIF_PATHS[variant];
  const isDecorative = !label;

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      focusable={false}
      className={cx(
        "knot-motif",
        `knot-motif--${variant}`,
        animated && "knot-motif--animated",
        className,
      )}
      {...(isDecorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
      {...svgProps}
    >
      {/* pathLength normalizes the stroke length to 1 for the draw-in animation. */}
      <path className="knot-motif__thread" d={d} pathLength={1} />
    </svg>
  );
}
