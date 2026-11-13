import { useId, type InputHTMLAttributes } from "react";
import { cx } from "../cx";
import { AlertIcon } from "../icons";
import "./TextField.css";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Visible label associated with the input. Required so every field has a name. */
  label: string;
  /** Optional supporting text shown below the input. */
  hint?: string;
  /**
   * Validation error message. Setting this marks the input invalid, exposes the
   * message via `aria-describedby` and prefixes an icon so the error does not
   * rely on color alone.
   */
  error?: string;
}

/**
 * Labelled single-line text input.
 *
 * Generates stable IDs with `useId` and wires `<label htmlFor>`, `aria-invalid`
 * and `aria-describedby` automatically. When both `hint` and `error` are given,
 * both IDs are listed in `aria-describedby` (error first) so screen readers
 * announce the error without losing the hint.
 */
export function TextField({
  label,
  hint,
  error,
  id: providedId,
  className,
  "aria-describedby": providedDescribedBy,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId, providedDescribedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("knot-field", error && "knot-field--error", className)}>
      <label className="knot-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="knot-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="knot-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="knot-field__error">
          <AlertIcon className="knot-field__error-icon" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
