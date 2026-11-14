import type { ButtonHTMLAttributes, Ref } from "react";
import { cx } from "../cx";
import "./Button.css";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** React 19 ref prop for explicit focus restoration by composing workflows. */
  ref?: Ref<HTMLButtonElement>;
  /**
   * Visual weight:
   * - `primary`: the one main action of a view (filled terracotta).
   * - `secondary`: regular actions (outlined surface). Default.
   * - `quiet`: low-emphasis actions inside toolbars, panels and dialogs.
   */
  variant?: ButtonVariant;
  /** Control height and text size. Defaults to `md`. */
  size?: ButtonSize;
}

/**
 * KNOT button.
 *
 * Renders a native `<button>`, so keyboard activation (Enter/Space), disabled
 * handling and form semantics come from the platform. The type defaults to
 * `"button"` to prevent accidental form submission; pass `type="submit"`
 * explicitly when needed. Icon-only buttons must receive an `aria-label`.
 *
 * Interaction states follow the design contract: hover is a subtle stroke
 * and lift, keyboard focus is a distinct ink-blue double ring.
 */
export function Button({
  variant = "secondary",
  size = "md",
  type = "button",
  className,
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "knot-button",
        `knot-button--${variant}`,
        `knot-button--${size}`,
        className,
      )}
      {...buttonProps}
    />
  );
}
