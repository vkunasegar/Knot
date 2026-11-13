# Shared

Place reusable UI primitives, design tokens, utilities and platform-neutral
types here when multiple modules need them. Keep feature-specific behavior
with its feature. Shared modules depend only on other shared modules and
general-purpose libraries.

## Styles (`styles/`)

- [`styles/tokens.css`](styles/tokens.css) — CSS custom properties for the
  warm-ivory palette, contrast-verified text tokens, Playfair Display / Inter
  font stacks, `rem`-based type scale, 4–64 px spacing scale, radii, warm
  elevations, ink-blue focus ring and motion durations. Includes built-in
  overrides for `prefers-contrast: more`, `forced-colors: active` and
  `prefers-reduced-motion: reduce`, plus `data-knot-contrast="more"` and
  `data-knot-motion="reduce"` attributes on `<html>` for the design preview.
- [`styles/fonts.css`](styles/fonts.css) — local `@fontsource-variable/inter`
  and `@fontsource-variable/playfair-display` imports bundled by Vite (SIL
  OFL 1.1, zero network requests).
- [`styles/base.css`](styles/base.css) — document-level reset, font defaults,
  `:focus-visible` fallback and `.knot-visually-hidden`. Imported once by each
  HTML entry point (`app/App.css` and `design-preview/DesignPreview.css`).

## UI primitives (`ui/`)

Import from [`ui/index.ts`](ui/index.ts) when consuming outside `shared/ui`:

| Component | Purpose |
| --- | --- |
| `KnotMotif` | Single continuous asymmetric SVG thread (`mark` and `flourish`). Decorative (`aria-hidden`, `pointer-events: none`) unless `label` is passed. Never place between notes or chips. |
| `Button` | Native `<button>` (`type="button"` by default) in `primary`, `secondary` and `quiet` variants (`sm` / `md`). Hover lifts subtly; keyboard focus uses the ink-blue double ring. |
| `TextField` | Labelled `<input>` with automatic `htmlFor`, `aria-invalid` and `aria-describedby` wiring for hints and icon-prefixed errors. |
| `NoteChip` | Compact note reference pill; renders a `<button aria-pressed>` when `onSelect` is given, or a static `<span>` otherwise. |
| `Panel` | `<section>` landmark labelled by its own heading (`h2`–`h4`), optional subtitle, header actions and elevation 0–2. |
| `Dialog` | Modal `<dialog>` using native `showModal()` for focus trapping, Escape dismissal and focus restoration. |
| `Tooltip` | Accessible `role="tooltip"` bubble opened on focus or hover and dismissible with Escape (WCAG 1.4.13). |
| `SaveStatus` | Presentational persistence indicator (`idle`, `saving`, `saved`, `error`). Callers pass `saved` only after a durable write is confirmed. |
| `StatusMessage` | Inline status/recovery banner (`info`, `success`, `warning`, `error`) with icon, title, body and optional action. |

See the [design contract](../../docs/design/knot/README.md) and the
[module responsibilities and dependency rules](../README.md).
