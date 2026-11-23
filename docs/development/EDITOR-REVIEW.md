# Rich-text note editor — Issue #7

Issue [#7](https://github.com/vkunasegar/Knot/issues/7) belongs to **M1 — Reliable
Notes Core**. Branch `#7` starts at current `origin/main` (`51698eb`), including
the merged note library from #6.

## Behavior and persistence contract

The writing column has one visible editable title, workspace/note breadcrumbs,
an optional real thread-membership chip and a quiet rich-text body. Metadata is
available under **Note details**. There are no decorative network lines in the
body. Thread chips name stored threads and the note's actual ordered position;
no membership is invented when a note has no thread. A context read failure
leaves the document editable and explains that membership is unavailable.

The body supports headings (levels 1–3), paragraphs, bold/italic/underline/strike,
inline code, bullet/numbered lists, nested checklists, links, blockquotes, code
blocks, hard breaks and horizontal rules. The compact formatting group exposes
the common operations as ordinary Tab-accessible buttons with pressed states
and accessible names. The remaining StarterKit formatting is available through
its keyboard/input rules. `#`/`##`/`###`, `-`, `1.`, `[ ]` and triple backticks
followed by a space create their corresponding blocks. Ctrl/Cmd+B and I format
a selection; Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z undo/redo (Ctrl/Cmd+Y also redoes).

**Save title** or Enter saves the title. **Save body** or Ctrl/Cmd+S while the
body has focus saves the body. These are independent operations: a title save
does not silently save a body draft, and neither metadata writes nor a partial
save can label a still-dirty document as saved. A successful native repository
acknowledgement is the only source of a saved status. The title save/cancel
controls appear when the title differs from its confirmed value.

Drafts survive routes, favorites/archive/trash operations and panel/Focus Mode
changes within the application session. Trashed notes remain read-only.
Discarding body changes returns to the confirmed body with fresh editor
history, so Undo cannot resurrect the discarded draft. Reload/close requests
with drafts use the platform's `beforeunload` safeguard where supported.
Drafts/history are session state; crash recovery and autosave belong to #8.
Save explicitly before exiting or restarting the native app.

## Ownership and safeguards

- `app` creates repositories and the session-lived `NotesController`; the
  feature consumes only injected contracts. Rust keeps SQLite, revisions,
  transactions and acknowledgement validation. No migration, new IPC command
  or native permission is needed for the existing version-1 JSON envelope.
- `editorSchema` defines the exact OSS extension set used both by validation
  and the live editor. Existing empty version-1 documents become an editable
  empty paragraph without an implicit write. Before conversion, validation
  rejects unknown nodes, marks, attributes and misplaced fields, invalid nesting
  and unsafe link data. This matters because ProseMirror normally drops unknown
  attributes. Unsupported documents receive a text-only protected preview;
  opening them and changing note metadata never rewrites their stored body.
- The controller preserves opaque envelope metadata. Drafts retain the confirmed
  base body. Saves are single-flight and revision-checked; typing during a save
  keeps the newer draft and rebases it only onto the acknowledged body. A failed
  or oversized write leaves the complete local draft available. The existing
  title and 10 MiB document limits apply.
- Conflicts read back the inventory, keep local text, show a stored-body preview
  and block a blind retry over different external content. The user can copy
  the local version and explicitly discard it to use the stored one. There is
  no automatic merge. Unknown write outcomes require readback before retry.
  JSON equality ignores object-key order because native serialization can
  reorder keys; a committed draft must not become a false conflict after a lost
  acknowledgement.
- Each mounted note owns one editor. A save acknowledgement never replaces the
  document if its structure already matches, preserving selection and history.
  The shell calls the editor's focus API rather than focusing its DOM directly.
  `SelectionHistory` keeps marked text selected on redo, correcting the installed
  history library's caret-at-end behavior for formatting-only transactions.
  Text insertion/deletion keeps ProseMirror's own history/cursor behavior.
- Focus Mode consumes Escape before editor keymaps; a native modal retains
  priority. In a link dialog, Escape closes the dialog and restores the document
  selection. A second Escape exits Focus Mode. No editor remount is involved.
- Links accept full HTTP(S) and mailto addresses; active/file/relative protocols
  and control-character obfuscation are rejected. Link clicks do not launch
  navigation from the WebView. An external opener is a separate native contract.
  Pasted HTML goes through the editor schema; arbitrary stored HTML is never
  inserted into React. Code blocks and text display literal content.
- Actual Inter and Playfair Display italic faces are bundled locally. This is
  required because global typography disables synthetic font styles. No font,
  editor extension or document service requires a network connection at runtime.

## Tiptap/ProseMirror spike and license review

The spike confirms the chosen Tiptap/ProseMirror direction with React 19,
structured version-1 storage, ordinary contenteditable keyboard interaction,
selection-aware formatting, native WebKitGTK mounting and a production build.
No paid extension or hosted service is used.

| Direct editor package    | Pinned version | Package license |
| ------------------------ | -------------- | --------------- |
| `@tiptap/core`           | 3.35.0         | MIT             |
| `@tiptap/react`          | 3.35.0         | MIT             |
| `@tiptap/pm`             | 3.35.0         | MIT             |
| `@tiptap/starter-kit`    | 3.35.0         | MIT             |
| `@tiptap/extensions`     | 3.35.0         | MIT             |
| `@tiptap/extension-list` | 3.35.0         | MIT             |

StarterKit supplies basic nodes/marks, links, list keymaps and cursor support;
its UndoRedo extension is extended locally as described above. TaskList and
TaskItem come from the OSS list package. The installed ProseMirror model
1.25.13, state 1.4.4, view 1.43.0 and history 1.5.2 packages declare MIT.

`pnpm licenses list --prod --json` reviewed the installed production graph:
57 MIT packages, two OFL-1.1 font packages, and one Apache-2.0 OR MIT package.
The existing font packages remain at their previous versions. `pnpm audit
--prod` reported **no known vulnerabilities** on 2026-11-23. This records the
resolved package metadata and advisories at review time.

Primary references: [React integration](https://tiptap.dev/docs/editor/getting-started/install/react),
[StarterKit contents](https://tiptap.dev/docs/editor/extensions/functionality/starterkit),
[list extensions](https://tiptap.dev/docs/editor/extensions/lists), and the
[Tiptap MIT license](https://github.com/ueberdosis/tiptap/blob/v3.35.0/LICENSE.md).

## Verification

Verified on 2026-11-23 using the prepared CachyOS Linux host through the
existing Agent/Flatpak bridge.

| Check                                                                                             | Actual result                                                        |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm format:check`                                                                               | Passed.                                                              |
| `pnpm lint`                                                                                       | Passed without warnings.                                             |
| `pnpm check`                                                                                      | Passed for application, tooling and browser fixtures.                |
| `pnpm test`                                                                                       | 156 tests passed in 23 files.                                        |
| `pnpm test:ui`                                                                                    | 64 tests passed, across 1600×1000 and 1440×900.                      |
| Final font/layout check (`pnpm test:ui --grep 'round-trips\|checks empty\|only local resources'`) | Eight tests passed after bundling italic faces; screenshots updated. |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`                                       | Passed.                                                              |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`         | Passed.                                                              |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked`                                        | 17 tests passed.                                                     |
| `pnpm check:linux`                                                                                | Pinned tools and native libraries found.                             |
| `pnpm build --no-bundle -- --locked`                                                              | Passed; native Linux release executable built.                       |
| `pnpm audit --prod`                                                                               | No known vulnerabilities.                                            |

Browser acceptance covers empty, mixed and long bodies; formatting/task/link
round trips and envelope metadata; real DOM selection before/after toolbar,
save, undo/redo and Focus Mode; input rules; keyboard link editing and invalid
URLs; nested modal Escape; failed writes, navigation and dirty status; external
conflicts and protected future documents. It also covers WCAG A/AA scans,
responsive widths down to 640 px, 200% text, forced colors and reduced motion.
Tests inject an isolated repository/membership fixture only into test builds;
production bundles exclude the test entries and controls.

Browser reload tests exercise fixture persistence, not SQLite durability. A new
native storage test writes mixed headings, marks, links, ordered/bullet/task
lists and code blocks through the real JSON request protocol, closes the
SQLite service, reopens it and verifies the entire confirmed record unchanged.

The actual release executable was started without Vite with isolated temporary
XDG data/config/cache directories. An AT-SPI probe created a note and confirmed
that WebKitGTK exposes the rich body, formatting group and Save body control.
Read-only inspection confirmed the note in the temporary SQLite file. The app
was stopped and the temporary profile removed. This probe verifies native
mounting/create; it does not establish native rich-text typing or selection parity.

## Review screenshots

These are the isolated test fixture, not seed data in the shipped app.

| View             | 1600×1000                                                  | 1440×900                                                  |
| ---------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| Mixed formatting | [Screenshot](../review/issue-7/editor-mixed-1600x1000.png) | [Screenshot](../review/issue-7/editor-mixed-1440x900.png) |
| Focus Mode       | [Screenshot](../review/issue-7/editor-focus-1600x1000.png) | [Screenshot](../review/issue-7/editor-focus-1440x900.png) |
| Empty note       | [Screenshot](../review/issue-7/editor-empty-1600x1000.png) | [Screenshot](../review/issue-7/editor-empty-1440x900.png) |

## Remaining manual checks

- Native WebKitGTK rich-text typing, IME, clipboard, selection, links and undo/redo
  on Wayland/X11; HiDPI 125% and 150%.
- Human screenreader review of rich-text editing, list structure and task state.
- Windows/WebView2 and macOS/WKWebView build/runtime checks on their own OSes.

Autosave/crash recovery, document revisions UI and an external-link opener remain
separate work. Successful explicit saves are durable; session drafts/history are
not advertised as crash-restored.
