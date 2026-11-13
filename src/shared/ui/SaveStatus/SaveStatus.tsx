import { cx } from "../cx";
import { AlertIcon, CheckIcon, InfoIcon, PendingIcon } from "../icons";
import "./SaveStatus.css";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface SaveStatusProps {
  /**
   * Current persistence state reported by the storage layer:
   * - `idle`: no write has run in this session yet.
   * - `saving`: a write is in flight.
   * - `saved`: the storage layer has confirmed a durable write.
   * - `error`: the last write failed and needs recovery or retry.
   */
  state: SaveState;
  /** Optional supplementary text, e.g. the failure reason. */
  detail?: string;
  className?: string;
}

const STATE_LABELS: Record<SaveState, string> = {
  idle: "No unsaved changes",
  saving: "Saving…",
  saved: "Saved locally",
  error: "Save failed",
};

/**
 * Honest persistence indicator for the topbar and editor.
 *
 * Architecture rule (docs/architecture/TECH-STACK.md): this component is purely
 * presentational. It never guesses or optimistically switches to `"saved"`;
 * callers may pass `"saved"` only after the repository confirms a durable write.
 * Every state pairs an icon with a text label so status is never communicated
 * by color alone.
 */
export function SaveStatus({ state, detail, className }: SaveStatusProps) {
  const label = STATE_LABELS[state];

  return (
    <span
      role={state === "error" ? "alert" : "status"}
      className={cx("knot-save-status", `knot-save-status--${state}`, className)}
    >
      {state === "idle" && <InfoIcon className="knot-save-status__icon" />}
      {state === "saving" && <PendingIcon className="knot-save-status__icon" />}
      {state === "saved" && <CheckIcon className="knot-save-status__icon" />}
      {state === "error" && <AlertIcon className="knot-save-status__icon" />}
      <span className="knot-save-status__label">{label}</span>
      {detail && <span className="knot-save-status__detail">— {detail}</span>}
    </span>
  );
}
