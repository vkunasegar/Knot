/**
 * Public entry point of the shared KNOT UI primitives.
 *
 * Modules outside `shared/ui` import components from here only. Each component
 * imports its own scoped stylesheet; the design tokens and global base styles
 * must be loaded once by the entry point via `shared/styles/base.css`.
 */
export { Button } from "./Button/Button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./Button/Button";

export { KnotMotif } from "./KnotMotif/KnotMotif";
export type { KnotMotifProps, KnotMotifVariant } from "./KnotMotif/KnotMotif";

export { NoteChip } from "./NoteChip/NoteChip";
export type { NoteChipProps } from "./NoteChip/NoteChip";

export { TextField } from "./TextField/TextField";
export type { TextFieldProps } from "./TextField/TextField";
