import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "../Button/Button";
import { cx } from "../cx";
import { CloseIcon } from "../icons";
import "./Dialog.css";

export interface DialogProps {
  /** Controls whether the modal dialog is open. */
  open: boolean;
  /** Called when the dialog is dismissed (Close button or Escape). */
  onClose: () => void;
  /** Heading rendered at the top of the dialog and linked via `aria-labelledby`. */
  title: string;
  /** Optional introductory text linked via `aria-describedby`. */
  description?: string;
  /** Accessible name for the built-in close button. Defaults to `"Close dialog"`. */
  closeLabel?: string;
  /** Optional footer buttons (e.g. Cancel / Confirm). */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Modal dialog built on the native `<dialog>` element.
 *
 * Calling `showModal()` gives the dialog platform-level behavior in both
 * WebKitGTK and Chromium: a focus trap, Escape dismissal, background inertness
 * and automatic focus restoration when the dialog closes. Synchronizing the
 * native `open` state in an effect keeps the component controlled from React;
 * listening for the native `close` event forwards Escape presses to `onClose`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel = "Close dialog",
  footer,
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = description ? `${titleId}-description` : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cx("knot-dialog", className)}
      onClose={onClose}
    >
      <div className="knot-dialog__frame">
        <header className="knot-dialog__header">
          <h2 id={titleId} className="knot-dialog__title">
            {title}
          </h2>
          <Button
            variant="quiet"
            size="sm"
            aria-label={closeLabel}
            className="knot-dialog__close"
            onClick={() => dialogRef.current?.close()}
          >
            <CloseIcon />
          </Button>
        </header>
        {description && (
          <p id={descriptionId} className="knot-dialog__description">
            {description}
          </p>
        )}
        <div className="knot-dialog__body">{children}</div>
        {footer && <footer className="knot-dialog__footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
