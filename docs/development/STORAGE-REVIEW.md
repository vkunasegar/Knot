# Issue #4 verification and PR checklist

This issue implements the native domain/storage foundation, not a note editor or
note-management screen. The review should focus on persistence semantics, object
ownership, recoverable failures and the UI/native contract.

The implementation plan followed inspection of the merged Issue #3 shell, the
frontend module rules, the accepted technical architecture and all Issue #4
acceptance criteria. The selected boundary is small typed frontend repositories,
a native application-owned service, transaction-scoped Rust repositories, and a
separate migration runner. See [the complete domain contract](../architecture/DOMAIN-MODEL.md).

## Automated checks

Run from the repository root on a prepared host:

```sh
pnpm check
pnpm test
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --manifest-path src-tauri/Cargo.toml --locked
pnpm test:ui
pnpm build --no-bundle -- --locked
```

Recorded results on 2026-11-14:

| Check | Result |
| --- | --- |
| TypeScript | Passed. |
| Vitest | 99 tests passed, including 36 new adapter/response/error tests. |
| Rust | 15 tests passed against temporary on-disk databases and the Tauri IPC test runtime. |
| Rust formatting | Passed. |
| Browser regression suite | 38 tests passed at 1600×1000 and 1440×900, including keyboard, axe, responsive layout and reduced motion. |
| Linux native release build | Passed with locked dependencies; the normal production bundle excludes the editable test-document fixture. |
| Linux native shell smoke | Production executable started without Vite in an isolated XDG profile; seven navigation entries, All Notes navigation/heading and search dialog verified through AT-SPI. |
| Windows/macOS | Native tests added to the existing CI matrix; this branch's results must be checked after push. |

Rust coverage includes empty migration/reopen with exact document retention,
note CRUD/archive/trash/restore, connection CRUD/canonicalization/duplicates,
collection/thread metadata and membership CRUD, multiple memberships, stale
revisions, missing entities, direct SQL constraints, failed replacement rollback,
safe container deletion, trash-preserved relationships and purge cascades.

Failure tests cover broken migration rollback (including data/schema/history),
future/foreign/modified schemas, corrupt files and documents, existing orphaned
links, writer locks, retry after failed initialization, and concurrent saves from
two separate services. None of those tests uses the user's app-data directory.

The IPC test uses the generated command handler and actual capability configuration:
the local main window can persist/read a note and receives stable validation errors;
another window and a remote origin cannot execute the storage command. Its WebView
runtime is mocked, so this does not replace a real WebKitGTK runtime check.

The separate native shell smoke used the actual release executable on the KDE
host and terminated its own process afterwards. WebKitGTK exposes the search
trigger as a combobox because it advertises a listbox popup; the smoke invoked its
accessible action rather than requiring a push-button role. This smoke covers
shell startup/navigation, not the real-WebView storage round-trip below.

Adapter tests verify request translation, immutable request snapshots, pending
save acknowledgement, every stable error code, explicit recovery, no implicit write
retry, non-lossy JSON, response shape/identity/revision checks, membership invariants,
and rejection of malformed deletion acknowledgements.

No UI/CSS changes are introduced. The existing keyboard, focus, accessibility,
responsive layout and reduced-motion suite provides regression coverage. The
factory is available for application composition but the shell has no document
workflow to consume it yet. No fake data or review fixture enters production.

## Manual native storage check

Use a disposable profile; keep the printed path for the restart check. On Linux,
run these commands in the same terminal (the XDG override affects only the child):

```sh
KNOT_REVIEW_PROFILE=$(mktemp -d)
echo "$KNOT_REVIEW_PROFILE"
XDG_DATA_HOME="$KNOT_REVIEW_PROFILE" pnpm dev
```

Open the native window's development inspector (Ctrl+Shift+I / Inspect Element).
In its JavaScript console, load the real adapter through the development server:

```js
var store = (await import('/src/data/index.ts')).createDomainRepositories();
var input = {
  title: 'Issue 4 persistence review',
  body: { version: 1, document: { type: 'doc', content: [] } },
  isFavorite: false, isArchived: false, isDeleted: false,
};
var a = await store.notes.create(input);
var b = await store.notes.create({ ...input, title: 'Second note' });
var collection = await store.collections.create({ name: 'Review collection', description: '' });
var thread = await store.threads.create({ name: 'Review thread', description: '' });
var collectionMembers = await store.collections.setMembers(collection.id, collection.revision, [a.id, b.id]);
var threadMembers = await store.threads.setMembers(thread.id, thread.revision, [b.id, a.id]);
var edge = await store.connections.create({
  sourceNoteId: a.id, targetNoteId: b.id,
  kind: 'related', direction: 'undirected', strength: 0.5,
});
console.log(await store.notes.list(), collectionMembers, threadMembers, edge);
```

Expected: two saved notes, independent membership orders, one canonical link.
Copy the printed IDs or simply list the entities after restarting. Close the app
and stop its dev process, then start it again with the **same** profile:

```sh
XDG_DATA_HOME="$KNOT_REVIEW_PROFILE" pnpm dev
```

Reload `store` in the inspector. `await store.notes.list()`,
`await store.collections.list()` and `await store.threads.list()` must return the
same IDs/content/revisions. `getMembers(id)` must retain the recorded order.

Using fresh snapshots from these lists:

1. Delete the collection with `store.collections.delete(id, revision)`. Both notes,
   the thread and the connection must remain.
2. Save a note with `store.notes.update(id, revision, updatedInput)`. Repeat using
   the old revision: expect `StoreError` with `code: 'conflict'`; readback must retain
   the first successful change.
3. Set `isDeleted: true` through an update, preserving the current title/body/flags.
   Relationships remain. `purge(id, currentRevision)` then removes only that note
   and its relationships. The other note and the thread survive.
4. Read back after another restart. No deleted container/link may reappear.

These checks exercise the native WebView → TypeScript adapter → Tauri → SQLite
path. They cannot yet be performed through product note buttons because those
workflows belong to later issues. Do not run destructive review snippets against
a profile containing real documents.

## Before approving the PR

- [ ] Accept the domain decisions: undirected link uniqueness, distinct-note thread
  paths, multi-membership, archive/trash retention and permanent-delete semantics.
- [ ] Review class/struct responsibilities, dependency injection, transaction
  ownership and comments in the contracts, service, repositories and migration runner.
- [ ] Confirm the current CI run is green: frontend checks and native tests/builds
  on Linux, Windows and macOS. Compilation does not establish native runtime parity.
- [ ] Perform the isolated native persistence/restart/container-delete/conflict
  check above. Record WebKitGTK runtime failures rather than retrying writes blindly.
- [ ] Start the production executable without Vite; verify normal shell navigation,
  Ctrl+K, focus restoration and window behavior still work.
- [ ] Confirm that future UI workflows will filter trash consistently and display
  storage/conflict failures without falsely showing “saved”. This PR exposes the
  error contracts; it does not implement those future screens.

Remaining platform/runtime checks, human code review and this checklist must be
completed before merge. New migration files must be appended after version 1 ships.
