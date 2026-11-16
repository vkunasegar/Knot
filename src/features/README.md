# Features

Place each user workflow in its own module, such as `notes`, `collections`,
`threads` or `search`, when implementation begins. Keep its UI, workflow logic,
styles and tests together, and expose its public API through `index.ts`.

Features use shared primitives and injected data-service contracts. Application
composition connects features and supplies concrete services.

`notes/` supplies `NotesController`, `NotesWorkspace` and the small view/sort
contracts used by app composition. It consumes only `NoteRepository`, preserves
complete stored documents during metadata changes, and never invokes native
commands directly. The app owns one controller for the session, so unsaved title
drafts survive route/layout changes. No document body editor or automatic save
loop is implemented here yet.

See the [module responsibilities and dependency rules](../README.md).
