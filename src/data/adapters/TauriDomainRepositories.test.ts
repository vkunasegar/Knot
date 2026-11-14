import { describe, expect, it, vi } from "vitest";
import { createDomainRepositories } from "./TauriDomainRepositories";
import type { CollectionId, ConnectionId, Note, NoteId, NoteInput, ThreadId } from "../../shared/domain";
import { StoreError } from "../../shared/domain";

const noteId = "00000000-0000-4000-8000-000000000001" as NoteId;
const secondNoteId = "00000000-0000-4000-8000-000000000002" as NoteId;
const collectionId = "00000000-0000-4000-8000-000000000003" as CollectionId;
const threadId = "00000000-0000-4000-8000-000000000004" as ThreadId;
const connectionId = "00000000-0000-4000-8000-000000000005" as ConnectionId;
const input: NoteInput = {
  title: "A thought", body: { version: 1, document: { type: "doc", content: [] }, futureMetadata: { keep: true } },
  isFavorite: false, isArchived: false, isDeleted: false,
};
const note: Note = {
  id: noteId, title: input.title, body: input.body, isFavorite: false,
  createdAt: 1000, updatedAt: 1000, archivedAt: null, deletedAt: null, revision: 1,
};
const group = { id: collectionId, name: "Ideas", description: "", createdAt: 1000, updatedAt: 1000, revision: 1 };
const link = { sourceNoteId: noteId, targetNoteId: secondNoteId, kind: "related" as const,
  direction: "undirected" as const, strength: 0.5 };
const connection = { ...link, id: connectionId, createdAt: 1000, updatedAt: 1000, revision: 1 };

describe("native repository contracts", () => {
  it("constructs lazily and preserves complete document envelopes", async () => {
    const invoke = vi.fn().mockResolvedValue(note);
    const store = createDomainRepositories(invoke);
    expect(invoke).not.toHaveBeenCalled();
    expect(await store.notes.create(input)).toEqual(note);
    expect(invoke).toHaveBeenCalledWith("store_execute", { request: { operation: "createNote", input } });
    expect((await store.notes.get(noteId)).body.futureMetadata).toEqual({ keep: true });
    expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "getNote", id: noteId } });
    invoke.mockResolvedValue([note]);
    expect(await store.notes.list()).toEqual([note]);
  });

  it("keeps a save pending until native acknowledgement and snapshots mutable input", async () => {
    let acknowledge!: (value: unknown) => void;
    const invoke = vi.fn(() => new Promise<unknown>((resolve) => { acknowledge = resolve; }));
    const store = createDomainRepositories(invoke);
    const mutable = structuredClone(input);
    let saved = false;
    const pending = store.notes.update(noteId, 1, mutable).then(() => { saved = true; });
    Object.assign(mutable, { title: "Later edit" });
    await Promise.resolve();
    expect(saved).toBe(false);
    expect(invoke).toHaveBeenCalledWith("store_execute", { request: {
      operation: "updateNote", id: noteId, expectedRevision: 1, input,
    } });
    acknowledge({ ...note, revision: 2 });
    await pending;
    expect(saved).toBe(true);
  });

  it.each(["invalidInput", "notFound", "conflict", "busy", "unavailable", "incompatibleSchema", "corruptDatabase", "internal"])(
    "returns stable %s failures without retrying a write", async (code) => {
      const invoke = vi.fn().mockRejectedValue(code);
      await expect(createDomainRepositories(invoke).notes.create(input)).rejects.toMatchObject({ name: "StoreError", code });
      expect(invoke).toHaveBeenCalledTimes(1);
    },
  );

  it("sanitizes unexpected errors and lets a later explicit call recover", async () => {
    const invoke = vi.fn().mockRejectedValueOnce(new Error("SQL /private/path document secret")).mockResolvedValue(note);
    const store = createDomainRepositories(invoke);
    await expect(store.notes.get(noteId)).rejects.toEqual(new StoreError("unavailable"));
    expect(await store.notes.get(noteId)).toEqual(note);
  });

  it.each([
    null, {}, { ...note, id: "wrong" }, { ...note, revision: 0 }, { ...note, revision: 1.5 },
    { ...note, updatedAt: 999 }, { ...note, createdAt: Number.MAX_SAFE_INTEGER + 1 },
    { ...note, body: { version: 2, document: { type: "doc" } } }, { ...note, body: {} },
    { ...note, isFavorite: 1 }, { ...note, deletedAt: -1 }, { ...note, archivedAt: "today" },
  ])("rejects malformed note acknowledgements (%j)", async (response) => {
    const store = createDomainRepositories(vi.fn().mockResolvedValue(response));
    await expect(store.notes.create(input)).rejects.toMatchObject({ code: "invalidResponse" });
  });

  it("rejects malformed inventory entries rather than dropping documents", async () => {
    const store = createDomainRepositories(vi.fn().mockResolvedValue([note, { ...note, body: null }]));
    await expect(store.notes.list()).rejects.toMatchObject({ code: "invalidResponse" });
  });

  it("rejects acknowledgements for another entity or an unchanged revision", async () => {
    const invoke = vi.fn().mockResolvedValue({ ...note, id: secondNoteId });
    const store = createDomainRepositories(invoke);
    await expect(store.notes.get(noteId)).rejects.toMatchObject({ code: "invalidResponse" });
    invoke.mockResolvedValue(note);
    await expect(store.notes.update(noteId, 1, input)).rejects.toMatchObject({ code: "invalidResponse" });
    invoke.mockResolvedValue({ ...note, revision: 3 });
    await expect(store.notes.update(noteId, 1, input)).rejects.toMatchObject({ code: "invalidResponse" });
    invoke.mockResolvedValue({ group: { ...group, id: threadId }, members: [] });
    await expect(store.collections.getMembers(collectionId)).rejects.toMatchObject({ code: "invalidResponse" });
  });

  it("rejects lossy or cyclic documents before invoking native code", async () => {
    const invoke = vi.fn(); const store = createDomainRepositories(invoke);
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    for (const broken of [NaN, Infinity, undefined, new Date(), cyclic, [1, , 3]]) {
      const bad = { ...input, body: { ...input.body, broken } } as unknown as NoteInput;
      await expect(store.notes.create(bad)).rejects.toMatchObject({ code: "invalidInput" });
    }
    expect(invoke).not.toHaveBeenCalled();
  });

  it("requires an explicit null acknowledgement for destructive operations", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    const store = createDomainRepositories(invoke);
    await expect(store.notes.purge(noteId, 2)).rejects.toMatchObject({ code: "invalidResponse" });
    invoke.mockResolvedValue(null);
    await store.notes.purge(noteId, 2);
    expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "purgeNote", id: noteId, expectedRevision: 2 } });
  });

  it("translates all connection operations and validates link invariants", async () => {
    const invoke = vi.fn().mockResolvedValue(connection); const store = createDomainRepositories(invoke);
    expect(await store.connections.create(link)).toEqual(connection);
    expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "createConnection", input: link } });
    await store.connections.get(connectionId);
    expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "getConnection", id: connectionId } });
    invoke.mockResolvedValue({ ...connection, revision: 2 });
    await store.connections.update(connectionId, 1, link);
    expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "updateConnection", id: connectionId, expectedRevision: 1, input: link } });
    invoke.mockResolvedValue([connection]); expect(await store.connections.list()).toEqual([connection]);
    for (const broken of [{ kind: "future" }, { direction: "either" }, { strength: 2 }, { strength: NaN },
      { targetNoteId: noteId }, { sourceNoteId: secondNoteId, targetNoteId: noteId }]) {
      invoke.mockResolvedValue({ ...connection, ...broken });
      await expect(store.connections.get(connectionId)).rejects.toMatchObject({ code: "invalidResponse" });
    }
    invoke.mockResolvedValue(null); await store.connections.delete(connectionId, 1);
    expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "deleteConnection", id: connectionId, expectedRevision: 1 } });
  });

  it.each(["collection", "thread"] as const)("translates %s metadata and atomic membership CRUD", async (kind) => {
    const id = kind === "collection" ? collectionId : threadId;
    const entity = { ...group, id }; const snapshot = { group: entity, members: [{ noteId, position: 0 }] };
    const invoke = vi.fn().mockResolvedValue(entity); const store = createDomainRepositories(invoke);
    // The two separately branded public contracts share the same implementation.
    const exercise = async <I extends typeof id>(repository: import("../contracts").GroupRepository<I>, groupId: I) => {
      const data = { name: "Ideas", description: "" };
      expect(await repository.create(data)).toEqual(entity);
      expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "createGroup", kind, input: data } });
      await repository.get(groupId);
      expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "getGroup", kind, id } });
      invoke.mockResolvedValue({ ...entity, revision: 2 });
      await repository.update(groupId, 1, data);
      expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "updateGroup", kind, id, expectedRevision: 1, input: data } });
      invoke.mockResolvedValue([entity]); expect(await repository.list()).toEqual([entity]);
      invoke.mockResolvedValue(snapshot); expect(await repository.getMembers(groupId)).toEqual(snapshot);
      invoke.mockResolvedValue({ ...snapshot, group: { ...entity, revision: 2 } });
      await repository.setMembers(groupId, 1, [noteId]);
      expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "setMembers", kind, id, expectedRevision: 1, noteIds: [noteId] } });
      invoke.mockResolvedValue(null); await repository.delete(groupId, 1);
      expect(invoke).toHaveBeenLastCalledWith("store_execute", { request: { operation: "deleteGroup", kind, id, expectedRevision: 1 } });
    };
    if (kind === "collection") await exercise(store.collections, collectionId);
    else await exercise(store.threads, threadId);
  });

  it.each([
    [{ noteId, position: 0 }, { noteId, position: 1 }],
    [{ noteId, position: 1 }, { noteId: secondNoteId, position: 0 }],
    [{ noteId, position: 0 }, { noteId: secondNoteId, position: 0 }],
    [{ noteId, position: -1 }], [{ noteId: "missing", position: 0 }],
  ])("rejects invalid membership snapshots (%j)", async (...members) => {
    const store = createDomainRepositories(vi.fn().mockResolvedValue({ group, members }));
    await expect(store.collections.getMembers(collectionId)).rejects.toMatchObject({ code: "invalidResponse" });
  });

  it("accepts ordered membership gaps after purge and rejects invalid group metadata", async () => {
    const invoke = vi.fn().mockResolvedValue({ group, members: [{ noteId, position: 4 }] });
    const store = createDomainRepositories(invoke);
    expect((await store.collections.getMembers(collectionId)).members[0].position).toBe(4);
    invoke.mockResolvedValue({ ...group, name: "  " });
    await expect(store.collections.get(collectionId)).rejects.toMatchObject({ code: "invalidResponse" });
  });
});
