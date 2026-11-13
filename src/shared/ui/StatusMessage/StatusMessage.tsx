import type { ReactNode } from "react";
import { cx } from "../cx";
import { AlertIcon, CheckIcon, InfoIcon } from "../icons";
import "./StatusMessage.css";

export type StatusTone = "info" | "success" | "warning" | "error";

export interface StatusMessageProps {
  /** Semantic tone. `error` renders with `role="alert"`; the others use `role="status"`. */
  tone?: StatusTone;
  /** Short summary shown in bold. */
  title: string;
  /** Optional longer explanation. */
  children?: ReactNode;
  /** Optional recovery or follow-up control (e.g. a Retry or Undo button). */
  action?: ReactNode;
  className?: string;
}

/**
 * Inline status banner for empty states, confirmations, warnings and recovery
 * prompts (such as failed writes or archive undo).
 *
 * Each tone combines a tinted surface, a strong border, an icon and text so
 * the severity is clear in grayscale and in forced-colors mode.
 */
export function StatusMessage({
  tone = "info",
  title,
  children,
  action,
  className,
}: StatusMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("knot-status-message", `knot-status-message--${tone}`, className)}
    >
      <span className="knot-status-message__icon">
        {tone === "info" && <InfoIcon />}
        {tone === "success" && <CheckIcon />}
        {(tone === "warning" || tone === "error") && <AlertIcon />}
      </span>
      <div className="knot-status-message__content">
        <p className="knot-status-message__title">{title}</p>
        {children && <div className="knot-status-message__body">{children}</div>}
      </div>
      {action && <div className="knot-status-message__action">{action}</div>}
    </div>
  );
}
