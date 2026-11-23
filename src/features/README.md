# Features

Place each user workflow in its own module, such as `notes`, `collections`,
`threads` or `search`, when implementation begins. Keep its UI, workflow logic,
styles and tests together, and expose its public API through `index.ts`.

Features use shared primitives and injected data-service contracts. Application
composition connects features and supplies concrete services.

`notes/` supplies `NotesController`, `NotesWorkspace` and the small view/sort
contracts used by app composition. It consumes `NoteRepository` and an optional
read-only thread-membership contract, preserves complete stored documents during
metadata changes, and never invokes native commands directly. The app owns one
controller for the session, so unsaved title/body drafts survive route/layout
changes. The feature owns the validated Tiptap schema, rich-text UI and explicit
body saves; an automatic save loop remains separate work. See the
[editor ownership and verification](../../docs/development/EDITOR-REVIEW.md).

See the [module responsibilities and dependency rules](../README.md).
