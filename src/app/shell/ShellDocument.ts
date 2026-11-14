import type { SaveStatusProps } from "../../shared/ui";

/**
 * The shell never owns or serializes a document. An editor supplies its title,
 * confirmed persistence status and a focus callback that preserves its selection.
 * The same editor remains mounted through every layout and Focus Mode change.
 */
export interface ShellDocument {
  readonly title: string;
  readonly saveStatus: SaveStatusProps;
  readonly focusEditor: () => void;
}
