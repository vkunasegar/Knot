/**
 * Joins CSS class names, skipping falsy entries.
 *
 * Keeps conditional BEM modifiers readable without adding a dependency:
 * `cx("knot-button", isActive && "knot-button--active", className)`.
 */
export function cx(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}
