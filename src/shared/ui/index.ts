/**
 * Public entry point of the shared KNOT UI primitives.
 *
 * Modules outside `shared/ui` import components from here only. Each component
 * imports its own scoped stylesheet; the design tokens and global base styles
 * must be loaded once by the entry point via `shared/styles/base.css`.
 */
export { KnotMotif } from "./KnotMotif/KnotMotif";
export type { KnotMotifProps, KnotMotifVariant } from "./KnotMotif/KnotMotif";
