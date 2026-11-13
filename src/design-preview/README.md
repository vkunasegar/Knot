# Design preview (`design-preview.html`)

Internal catalogue of KNOT's visual tokens, typography, decorative thread motif
and shared UI primitives.

- **Separate entry point:** mounted by [`/design-preview.html`](../../design-preview.html),
  not by `/index.html`. The native Tauri window loads `/index.html` only, so
  specimen copy from this folder never appears in the user-facing application.
- **One-way dependency:** this module imports `../shared/ui` and
  `../shared/styles/base.css`. Nothing in `app`, `features`, `data` or `shared`
  may import from `design-preview`.
- **How to open:** run `pnpm dev:web` and visit
  `http://localhost:1420/design-preview.html` (or `pnpm preview` at
  `http://127.0.0.1:4173/design-preview.html`).
