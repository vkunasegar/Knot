import { useEffect, useId, useRef, useState } from "react";
import { Dialog } from "../../shared/ui";
import { ShellIcon, type ShellIconName } from "./ShellIcon";
import "./SearchPalette.css";

export interface ShellAction {
  readonly id: string;
  readonly label: string;
  readonly icon: ShellIconName;
  readonly run: () => void;
}

interface SearchPaletteProps {
  open: boolean;
  actions: readonly ShellAction[];
  onClose: () => void;
  /** Execution occurs after modal focus restoration, so route/editor focus wins. */
  onSelect: (action: ShellAction) => void;
}

/** A shell action launcher with an ordinary, keyboard-accessible listbox. */
export function SearchPalette({
  open,
  actions,
  onClose,
  onSelect,
}: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const hintId = useId();
  const results = actions.filter(({ label }) =>
    label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const selectedIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      input.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${selectedIndex}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [listId, selectedIndex, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Search your workspace"
      description="Open a section or run a workspace action. Note search will become available when notes and search storage are ready."
      className="shell-palette"
    >
      <label className="knot-visually-hidden" htmlFor={`${listId}-input`}>
        Search sections and actions
      </label>
      <div className="shell-palette__input">
        <ShellIcon name="search" />
        <input
          ref={input}
          id={`${listId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            results.length ? `${listId}-${selectedIndex}` : undefined
          }
          aria-describedby={hintId}
          autoComplete="off"
          placeholder="Where would you like to go?"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              if (!results.length) return;
              event.preventDefault();
              if (event.key === "Home") setActiveIndex(0);
              else if (event.key === "End") setActiveIndex(results.length - 1);
              else
                setActiveIndex(
                  (selectedIndex +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    results.length) %
                    results.length,
                );
            } else if (event.key === "Enter" && results[selectedIndex]) {
              event.preventDefault();
              onSelect(results[selectedIndex]);
            }
          }}
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Sections and actions"
        className="shell-palette__results"
      >
        {results.map((action, index) => (
          <li
            key={action.id}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === selectedIndex}
            className="shell-palette__option"
            onMouseMove={() => setActiveIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(action)}
          >
            <ShellIcon name={action.icon} />
            <span>{action.label}</span>
            <span aria-hidden="true">↵</span>
          </li>
        ))}
      </ul>
      {!results.length && (
        <p role="status" className="shell-palette__empty">
          No matching sections or actions.
        </p>
      )}
      <p id={hintId} className="shell-palette__hint">
        ↑ ↓ to move · Enter to open · Esc to close
      </p>
    </Dialog>
  );
}
