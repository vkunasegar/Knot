# Native domain storage — Issue #4

The domain foundation supplies durable repositories for later note workflows.
The desktop shell still owns only layout/navigation. It does not create sample
documents or display a saved state on behalf of a repository.

## Ownership and object boundaries

| Object / module | Contract and lifetime |
| --- | --- |
| `shared/domain` | Platform-neutral values, branded entity IDs and stable error codes. |
| `data/contracts` | Async repository interfaces injected into features by `app`. |
| `createDomainRepositories` | Composes separate note, connection, collection and thread adapters with one injected IPC client. Construction performs no IO. |
| `NativeStoreClient` | Snapshots valid JSON input, calls the closed native protocol once, validates acknowledgements and maps errors. It never caches documents or retries writes. |
| Rust `StoreService` | Application-owned `Arc`; owns the native app-data path and a mutex-protected optional database. Failed initialization is retried on a subsequent explicit call. |
| Rust `Database` | Owns one connection until app shutdown; starts/commits each transaction. |
| Rust repositories | Small structs with methods, borrowing the transaction connection. They cannot commit independently or outlive the database. |
| `MigrationRunner` | Owns atomic, ordered schema upgrades and immutable migration-history checks. |

Composition and explicit ownership provide the object-oriented boundary in Rust
without an inheritance hierarchy or a generic SQL API. The native `GroupRepository`
shares collection/thread aggregate behavior using a closed enum. TypeScript exposes
separately branded collection/thread contracts so callers cannot mix their IDs.

`store_execute` is the only frontend command. Serde accepts a closed set of
operations and fields; no request can provide SQL, a file path or an entity's
creation ID. `build.rs` registers the app command manifest, and `main-window`
grants only `allow-store-execute` to the local main window. Other windows and
remote origins are denied. SQL/FS/shell plugins remain disabled. Blocking native
work runs on Tauri's blocking pool, outside the UI thread.

## Identity and document values

- Entity IDs are native-generated UUID v4 strings, in canonical lowercase form.
  The native boundary accepts canonical, non-nil UUIDs; frontend brands distinguish
  `NoteId`, `ConnectionId`, `CollectionId` and `ThreadId`. IDs never change on update.
- Metadata uses UTC epoch milliseconds and a positive revision. Native code creates
  timestamps. Updates never decrease `updatedAt` if the system clock moves backwards.
  Revision comparison, rather than wall-clock ordering, protects against lost edits.
- Note titles allow empty text (an untitled document), have a 4096 UTF-8 byte limit,
  and reject NUL. Group names must additionally contain non-whitespace text;
  descriptions allow 65536 UTF-8 bytes. Input is rejected rather than truncated.
- Note bodies use `{ version: 1, document: { type: "doc", ... }, ... }`, up to
  10 MiB of serialized UTF-8 JSON. Storage validates the envelope and preserves
  unknown document attributes/metadata. Full ProseMirror schema validation and
  rendering sanitization belong to the future editor. Storage is not an HTML renderer.
- The TypeScript adapter rejects non-JSON values, sparse arrays, cycles, class
  instances and nesting beyond 100 levels before calling IPC. Lossy serialization
  must not silently turn a user's content into a different saved document.

## Entity semantics

| Entity | Meaning and uniqueness |
| --- | --- |
| Note | Independent document with body, title, favorite flag and separate archive/trash timestamps. |
| Connection | Pairwise semantic link with kind, direction and strength in `[0, 1]`. No self-links. |
| Collection | Curated group of notes; membership order is its presentation order. |
| Thread | Ordered path through distinct notes; it creates no implicit connections. |
| Membership | Composite identity `(group ID, note ID)`; a note occurs once in a given group and can belong to many groups. |
| Knot / Loop | Derived graph concepts, with no persisted entity/table in this version. |

Connection kinds are `related`, `supports`, `contradicts`, `references`; direction
is `directed` or `undirected`. Uniqueness is `(source, target, kind, direction)`.
Undirected endpoints are sorted by canonical ID, so A–B and B–A are one link.
Directed A→B and B→A differ. Different kinds/directions may coexist between a pair.
Changing a link into a duplicate fails atomically and retains the old link.

Membership positions are nonnegative and unique per group. Reads sort by position.
`setMembers(id, expectedRevision, noteIds)` replaces the complete ordered list in
one transaction: it creates, reorders and removes memberships. `[]` clears a group.
Duplicate IDs or more than 10000 IDs are invalid. A missing note violates a foreign
key, rolls back the replacement and leaves the old order/revision intact. This API
is bounded for M0; large-group pagination/incremental commands are future work.

Metadata and membership changes share the group's revision. A stale rename,
reorder or deletion reports `conflict`. Purging a member also increments each
affected group's revision, so an earlier snapshot cannot overwrite that change.

## Delete and visibility policy

- `isArchived` and `isDeleted` are independent note input flags; native code sets
  or clears their timestamps. Trash/restore retains the document, connections and
  memberships, including its earlier archive state when the caller preserves it.
- Repository `get`/`list` returns the complete inventory, including archived and
  trashed notes and their relationships. User-facing workflows must filter visible
  notes and edges consistently. This layer does not implement a graph/search UI.
- `purge` requires a trashed note and its current revision. It physically removes
  that note; foreign keys cascade to incoming/outgoing connections and memberships.
  Other notes, collections and threads remain. Surviving positions can have gaps;
  their relative order remains stable, and the next replacement compacts positions.
- Deleting a collection or thread removes only the container and its memberships.
  Notes and pairwise connections survive. Deleting a connection affects only it.
- Missing entities return `notFound`; stale revisions, duplicate edges and missing
  relationship endpoints return `conflict`. Destructive operations are not silent
  no-ops: callers cannot mistake stale data for a successful deletion.

## File, migrations and durability

The file is `app.path().app_data_dir()/knot.sqlite3`, resolved natively using the
stable application identifier. It is opened lazily on the first repository call,
not by the shell. There is no browser/localStorage document fallback.

`rusqlite` bundles SQLite, avoiding differing system SQLite versions on desktop
targets. Each connection enables foreign keys, a 1500 ms busy timeout, WAL and
`synchronous=FULL`. Prepared statements bind user values. Only the closed group
enum chooses table identifiers. Notes have recent/favorite indexes, connections
have incoming/outgoing indexes, and memberships have reverse note indexes.

Schema version 1 contains strict note/connection/collection/thread/membership
tables plus `schema_migration`. `application_id` identifies KNOT; `user_version`
tracks schema progress. Applied migration names and SQL are stored and compared
on every open. Add a new ordered migration; **never edit an applied migration**.
The initial version has not yet shipped and is reviewed with this PR.

The migration runner obtains an immediate transaction before reading the version,
preventing competing processes from applying the same migration. Schema changes,
data changes, history and version all commit together. A failed migration rolls
back. Future versions, modified history and foreign databases are refused; nothing
is reset, truncated or silently repaired. Startup checks foreign keys and SQLite
integrity. Existing orphaned rows produce an error and remain available for recovery.

Every mutation obtains an immediate transaction; reads use a deferred snapshot.
Revisions are checked inside the writer transaction, including across separate
processes/connections. Serialization completes before commit. The frontend accepts
success only after commit and validates identity/revision for returned updates.

`busy` and `unavailable` are recoverable failures, not crashes or successful saves.
Other stable codes are `invalidInput`, `notFound`, `conflict`, `incompatibleSchema`,
`corruptDatabase`, `internal`; frontend protocol validation adds `invalidResponse`.
SQL diagnostics, paths and document contents are not exposed in error messages.
If IPC delivery is interrupted after a commit, the result is ambiguous: reload
before deciding whether to retry, especially for create operations. Automatic
retry/idempotency keys are not part of this foundation.

WAL and SHM sidecars belong to the active database. Copying only the main file
while it is open is not a supported backup. Backup/export, full-text indexing,
editor/autosave coordination and large-inventory pagination follow in later issues.

## Implementation references

- [Rusqlite bundled SQLite and platform notes](https://docs.rs/crate/rusqlite/0.42.0)
- [SQLite foreign-key deletion actions](https://www.sqlite.org/foreignkeys.html)
- [SQLite WAL durability](https://www.sqlite.org/wal.html)
- [Tauri application command manifest and capabilities](https://v2.tauri.app/security/capabilities/)
