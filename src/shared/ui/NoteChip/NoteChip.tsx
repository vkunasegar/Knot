import { cx } from "../cx";
import { NoteIcon } from "../icons";
import "./NoteChip.css";

export interface NoteChipProps {
  /** Title of the referenced note. */
  title: string;
  /** Optional short secondary label, e.g. a thread position or collection name. */
  meta?: string;
  /** Marks the chip as the currently selected note in a list or inspector. */
  selected?: boolean;
  /** Disables interaction when `onSelect` is set. */
  disabled?: boolean;
  /**
   * When provided, the chip renders as a `<button>` that can be activated by
   * mouse or keyboard. When omitted, it renders as a static `<span>` so
   * read-only note lists do not create dead tab stops.
   */
  onSelect?: () => void;
  className?: string;
}

/**
 * Compact pill representing a note in lists, breadcrumbs, threads and the
 * connection inspector.
 *
 * Decoration rule: the chip never draws a thread tail or connector line of its
 * own. Real links between notes belong to the connection inspector or The Weave,
 * where every drawn thread corresponds to a stored relationship.
 */
export function NoteChip({
  title,
  meta,
  selected = false,
  disabled = false,
  onSelect,
  className,
}: NoteChipProps) {
  const classes = cx(
    "knot-note-chip",
    Boolean(onSelect) && "knot-note-chip--interactive",
    selected && "knot-note-chip--selected",
    className,
  );

  const content = (
    <>
      <NoteIcon className="knot-note-chip__icon" />
      <span className="knot-note-chip__title">{title}</span>
      {meta && <span className="knot-note-chip__meta">{meta}</span>}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={classes}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
      >
        {content}
      </button>
    );
  }

  return <span className={classes}>{content}</span>;
}
