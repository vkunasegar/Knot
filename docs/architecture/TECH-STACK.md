# KNOT — Technical Architecture Decision (ADR-001)

**Status:** Accepted as initial implementation direction (review after first vertical slice).
**Priority:** Linux desktop first; same application and shared feature code for Windows and macOS.
**Vision:** Local-first, fast, tactile and calm. No account or server required for normal note-taking.

## Architecture
| Layer | Choice | Rationale |
| --- | --- | --- |
| Desktop shell | **Tauri 2**, Rust backend | Native desktop window, OS integration, small bundle, builds on Linux/Windows/macOS. |
| UI | **React + TypeScript + Vite** | Mature ecosystem for rich editors, highly custom UI, shared code across targets. |
| Styling | Scoped CSS + CSS custom properties/tokens | Own KNOT visual language; avoid generic component kits. |
| Editor | **Tiptap/ProseMirror (open-source extensions)** | Structured rich-text document, keyboard support, extensibility. Review OSS licenses before shipping. |
| Graph interaction | **@xyflow/react** as pan/zoom/selection foundation, custom SVG paths/cards | Build distinctive KNOT threads, not a generic mind map. Performance spike before final selection. |
| Persistent data | **SQLite** (through Rust repository / Tauri SQL plugin evaluation) | Local-first with schema migrations, searchable metadata and transactions. |
| UI state | React state + small focused store (e.g. Zustand only where needed) | Keep persisted domain state separate from transient panels, selection and zoom. |
| Search | SQLite FTS5 (plus indexed title/tag search) | Offline full-text search; debounce, ranking and preview extraction. |
| Tests | Vitest + React Testing Library; Playwright for UI; Rust tests | Domain + keyboard + end-to-end behavior. |
| CI | GitHub Actions | Linux primary build/test; macOS and Windows build smoke checks. |

## Native runtimes / portability
Tauri uses the OS WebView: **WebKitGTK on Linux, WKWebView on macOS, WebView2 on Windows**. Cross-platform source DOES NOT guarantee pixel-identical rendering. Test fonts, line breaks, cursor selection, code blocks, drag/drop and focus on all three. Windows/macOS binaries require runners on those target systems (especially macOS signing/notarization for distribution).

**Linux first:** begin with CachyOS / Arch-based developer setup; validate supported WebKitGTK dependencies, KDE Plasma, both Wayland and X11 where available, HiDPI 125% and 150%. Distribute Linux AppImage and/or .deb later; do not assume a .deb works on Arch. Native menu/window decorations should be platform appropriate.

The [CachyOS development guide](../development/CACHYOS.md) documents the current setup, dev/build/run commands, troubleshooting and outstanding native verification.

The [portability guide](../development/PORTABILITY.md) records the initial dependency review, rules for adding native dependencies and the Linux/Windows/macOS build matrix. Build smoke checks verify compilation; runtime and installed-app checks remain separate.

## Data model (initial)
- `note(id, title, body_json, created_at, updated_at, archived_at, deleted_at, is_favorite)`
- `connection(id, source_note_id, target_note_id, type, direction, strength, created_at)` (unique relationship policy decided before migration)
- `collection(id, name, description, created_at, updated_at)`
- `collection_note(collection_id, note_id, sort_index)`
- `thread(id, name, description, created_at, updated_at)`
- `thread_note(thread_id, note_id, position)`
- `setting(key, value_json)`; search indexes/FTS5 and migration history.

A **Collection** groups notes; a **Thread** is an ordered thought-path; a **Connection** is a pairwise semantic link. **Knot** and **Loop** are *derived graph concepts* in v1, not mandatory persisted entities. A note can belong to multiple threads/collections. Archive ≠ delete. Delete collection must not delete its notes.

## Boundary rules
- Frontend modules follow the documented [`app/features/shared/data` structure and dependency rules](../../src/README.md). The application wires concrete services; features consume their typed contracts.
- UI calls typed `NoteService`, `CollectionService`, `ThreadService`, `ConnectionService`, `SearchService`; platform-specific SQL/file APIs are isolated behind repository/adapters.
- IDs are stable; transactions keep membership, FTS updates and edge removal consistent.
- Autosave is acknowledged only AFTER the write is durable; retry/recovery if failed. Optimistic UI must never falsely say “saved”.
- No networking, cloud sync, account system, collaboration, or AI required for MVP.
- Export/backup: human-readable Markdown or JSON, with attachment strategy; verify complete round-trips before treating import as production-ready.

## Platform and security decisions
- Least-privilege Tauri capabilities; no unneeded shell/FS/global-shortcut permissions.
- App-only Ctrl/Cmd+K search (avoid hijacking OS shortcuts).
- No remote script execution; external links via secure opener; HTML sanitization/content rules.
- Versioned database migrations, periodic backup and restore tests.
- Pin compatible package versions via lockfile; run npm/Rust dependency and license checks.

## Definition of Done for cross-platform claims
Linux installed app can write/search/reopen data without a service. CI builds at minimum on Linux and has macOS/Windows matrix smoke coverage; platform-specific failures are visible as issues. No Linux-only paths or keyboard assumptions in shared code.

## Sources
- https://v2.tauri.app/
- https://v2.tauri.app/plugin/sql/
- https://tiptap.dev/docs/editor/getting-started/install/react
- https://reactflow.dev/
- https://v2.tauri.app/distribute/
