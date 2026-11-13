import {
  cloneElement,
  useEffect,
  useId,
  useState,
  type HTMLAttributes,
  type ReactElement,
} from "react";
import { cx } from "../cx";
import "./Tooltip.css";

export interface TooltipProps {
  /** Short supplementary text shown in the bubble. */
  content: string;
  /**
   * The single focusable trigger element. The tooltip clones it to attach
   * `aria-describedby`, so screen readers announce the tooltip content without
   * needing an extra wrapper in the tab order.
   */
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  className?: string;
}

/**
 * Accessible tooltip for supplementary hints (e.g. keyboard shortcuts).
 *
 * Follows WCAG 2.1 SC 1.4.13 (Content on Hover or Focus):
 * - **Dismissible:** pressing Escape hides the bubble without moving focus.
 * - **Hoverable:** the pointer events sit on the outer wrapper that contains
 *   both trigger and bubble, so moving the pointer onto the bubble keeps it open.
 * - **Persistent:** remains visible while the trigger is focused or hovered.
 *
 * The bubble stays in the DOM (hidden via the `hidden` attribute when closed)
 * and is referenced by `aria-describedby`.
 */
export function Tooltip({ content, children, className }: TooltipProps) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const open = (hovered || focused) && !dismissed;

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDismissed(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const existingDescribedBy = children.props["aria-describedby"];
  const describedBy = [existingDescribedBy, tooltipId].filter(Boolean).join(" ");

  return (
    <span
      className={cx("knot-tooltip", className)}
      onMouseEnter={() => {
        setDismissed(false);
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        setDismissed(false);
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
    >
      {cloneElement(children, { "aria-describedby": describedBy })}
      <span id={tooltipId} role="tooltip" hidden={!open} className="knot-tooltip__bubble">
        {content}
      </span>
    </span>
  );
}
