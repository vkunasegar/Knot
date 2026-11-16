# Notes library and recovery — Issue #6

For hands-on desktop acceptance, use the
[manual checklist through Issue #6](MANUAL-TEST-ISSUE-6.md). The optional
[agent-host bridge](AGENT-HOST.md) lets the Agent/Flatpak terminal run the same
`pnpm dev` command against the prepared host toolchain.

## User-visible behavior

The native note library now supports create, open, explicit title save, duplicate,
favorite, archive, trash and restore. Use **New note**, **Ctrl/Cmd+N**, or the
**New note** action in Ctrl/Cmd+K. Repeated/pending shortcuts cannot create extra
records. New notes are committed before opening their title field.

All Notes contains active records only. Favorites contains active favorites;
Archive excludes trash. Open trash from All Notes. Trash remains recoverable
after restarting the application; restoring an archived note returns it to
Archive. The UI offers no permanent deletion or automatic trash expiry.
Collection/thread deletion still removes only containers/memberships, with the
existing native regression tests verifying that documents survive.

Sort by last update (default), creation date, or title. Sorting is session-local.
Lists show real title, text preview and created/updated dates. Blank titles appear
as Untitled; long display titles wrap/clamp without changing stored data. Copies
receive a new ID, the full original body and a title ending in `(copy)`. Only the
copy's title prefix is shortened when necessary to fit the existing UTF-8 limit.
Copies start active and nonfavorite and acquire no connections/memberships.

Title edits require **Save title** or Enter. Cancel/Escape restores the confirmed
title. Unsaved drafts survive route, panel and Focus Mode changes during this
session, including failed writes. The unsaved indicator never claims a save.
The body opens in a plain-text reading view, without interpreting stored HTML or
attributes. Original JSON, including unknown editor metadata, remains intact.

## Ownership and failure handling

- `app` creates native repositories and one `NotesController` for the session.
  Constructors perform no IO. The first notes-area visit loads the inventory;
  React subscribes to controller snapshots and unsubscribes on unmount.
- The feature consumes `NoteRepository` through dependency injection. No native
  calls, SQL, browser persistence or platform paths enter the notes UI.
- Confirmed documents, title drafts, load errors and write errors remain separate.
  Writes are single-flight and use the last confirmed revision. Metadata updates
  always retain the complete document body and other flags.
- Conflicts/missing records trigger readback without overwriting local title
  drafts. Busy writes permit explicit retry. Interrupted/malformed acknowledgements
  block further writes until explicit inventory readback; create/duplicate are
  never automatically repeated. The user reviews the result before retrying.
- Undo applies only the inverse archive/trash flag to the current confirmed
  record. It does not restore an older document snapshot. One undo notification
  remains until dismissed, replaced by the next status operation, or app exit.
  Permanent recovery remains available through Archive/Trash after that.
- Shell routes support `#/notes`, `#/notes/trash`, and `#/<area>/<note-id>` for
  notes/favorites/archive. Invalid IDs never reach native storage. Browser/session
  history retains detail IDs; missing records have a recovery view. A completed
  create/duplicate does not override a newer navigation choice.
- The existing `ShellDocument` bridge supplies confirmed status and a workflow
  focus callback. SaveStatus adds an `unsaved` presentation state for explicit
  title edits. The same document stays mounted during layout/Focus changes.

There is no schema migration, new IPC command, permission or runtime dependency.
The browser has no substitute database in the production application: a regular
web preview reports native storage failure. Only the isolated test build injects
a contract double. Native/release builds exclude both test-host HTML entries and
their test repository/controls.

## Verification

Verified on 2026-11-16 using the prepared Linux host via `flatpak-spawn`.

`pnpm format:check` passed for the final frontend, configuration and documentation.

| Check                                                                                               | Result                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                                        | Passed for app, tooling and test fixtures.                                                                    |
| `pnpm lint`                                                                                         | Passed with zero warnings/errors.                                                                             |
| `pnpm test`                                                                                         | 128 tests passed in 20 files.                                                                                 |
| `pnpm test:ui`                                                                                      | 50 tests passed across 1600×1000 and 1440×900.                                                                |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`                                         | Passed.                                                                                                       |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked --offline -- -D warnings` | Passed.                                                                                                       |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`                                | 16 tests passed, including archived-trash restart/restore preserving the original body and archive timestamp. |
| `pnpm check:linux`                                                                                  | All pinned tools and native dependencies found.                                                               |
| `pnpm build --no-bundle -- --locked`                                                                | Passed; native release binary generated.                                                                      |

Controller/component regressions exercise Unicode and byte limits, preserved
unknown metadata, separate list filters, deterministic sorting, duplicate guards,
busy/revision/read failures, lost create acknowledgement, retry, undo, title drafts
and navigation while creation is pending. Browser tests use the actual app/feature
components with a test-only injected repository. They verify keyboard creation,
palette actions, title saving/focus, refresh/recovery, navigation history, mounted
content retention, long titles, minimum/responsive window sizes, 200% text,
forced colors, reduced motion and axe WCAG A/AA checks.

Browser reload verifies the UI's reload flow against the test fixture, not native
SQLite durability. Rust tests use actual temporary on-disk SQLite databases and
the closed native request protocol; native runtime checks are recorded separately.

The production release was also launched without Vite in the default GTK desktop
session with isolated XDG data/config/cache directories. An AT-SPI probe exercised
create, favorite, duplicate, archive, trash, full process shutdown/restart,
restore, unarchive and undo. Read-only inspection of the temporary SQLite file
confirmed the writes, stable IDs, body retention and original archive timestamp
after restore. The process was stopped and its temporary profile removed.
Native title typing was not verified by that probe: WebKitGTK did not expose a
writable AT-SPI text interface, and synthetic-key focus checks could not establish
a safe target. Unicode title entry/save is covered in Chromium and native storage
tests; native typing/shortcut review remains a manual check below.

## Review screenshots

These screenshots use the isolated test fixture; no sample records are shipped
in the production app.

| View           | 1600×1000                                                   | 1440×900                                                   |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| All Notes      | [Screenshot](../review/issue-6/all-notes-1600x1000.png)     | [Screenshot](../review/issue-6/all-notes-1440x900.png)     |
| Open note      | [Screenshot](../review/issue-6/note-detail-1600x1000.png)   | [Screenshot](../review/issue-6/note-detail-1440x900.png)   |
| Trash recovery | [Screenshot](../review/issue-6/note-recovery-1600x1000.png) | [Screenshot](../review/issue-6/note-recovery-1440x900.png) |

## Limits and remaining manual checks

Rich-text editing belongs to #7; autosave, crash restoration and revisions UI
belong to #8. Unsaved title drafts and undo notifications are session state and
are not crash-restored; explicit successful title saves are durable. Connections,
collection management, full-text search and the Home dashboard remain separate
workflows. This issue does not claim those features or full M1 completion.

- [ ] Review the new notes UI at Linux HiDPI 125% and 150% with a human screenreader.
- [ ] Verify native text selection, shortcuts and focus on both Wayland and X11.
- [ ] Run Windows/macOS CI build smoke checks and native runtime review on those OSes.

Automated accessibility checks and native accessibility probes do not replace a
human screenreader review. Cross-platform build/runtime checks were not run locally.
