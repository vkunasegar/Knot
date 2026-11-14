import { invoke } from "@tauri-apps/api/core";
import type { DomainRepositories, NoteRepository, ConnectionRepository, GroupRepository } from "../contracts";
import type { CollectionId, ThreadId, NoteId, NoteInput, ConnectionId, ConnectionInput, GroupId, GroupInput } from "../../shared/domain";
import { NativeStoreClient } from "./NativeStoreClient";
import type { NativeInvoke } from "./NativeStoreClient";
import * as decode from "./storageDecoders";

class TauriNoteRepository implements NoteRepository {
  constructor(private readonly client: NativeStoreClient) {}
  get(id: NoteId) { return this.client.execute({ operation: "getNote", id }, decode.identified(decode.note, id)); }
  list() { return this.client.execute({ operation: "listNotes" }, decode.list(decode.note)); }
  create(input: NoteInput) { return this.client.execute({ operation: "createNote", input }, decode.note); }
  update(id: NoteId, expectedRevision: number, input: NoteInput) {
    return this.client.execute({ operation: "updateNote", id, expectedRevision, input }, decode.identified(decode.note, id, expectedRevision));
  }
  purge(id: NoteId, expectedRevision: number) {
    return this.client.execute({ operation: "purgeNote", id, expectedRevision }, decode.nothing);
  }
}
class TauriConnectionRepository implements ConnectionRepository {
  constructor(private readonly client: NativeStoreClient) {}
  get(id: ConnectionId) { return this.client.execute({ operation: "getConnection", id }, decode.identified(decode.connection, id)); }
  list() { return this.client.execute({ operation: "listConnections" }, decode.list(decode.connection)); }
  create(input: ConnectionInput) { return this.client.execute({ operation: "createConnection", input }, decode.connection); }
  update(id: ConnectionId, expectedRevision: number, input: ConnectionInput) {
    return this.client.execute({ operation: "updateConnection", id, expectedRevision, input }, decode.identified(decode.connection, id, expectedRevision));
  }
  delete(id: ConnectionId, expectedRevision: number) {
    return this.client.execute({ operation: "deleteConnection", id, expectedRevision }, decode.nothing);
  }
}
class TauriGroupRepository<I extends GroupId> implements GroupRepository<I> {
  constructor(private readonly client: NativeStoreClient, private readonly kind: "collection" | "thread") {}
  get(id: I) { return this.client.execute({ operation: "getGroup", kind: this.kind, id }, decode.identified(decode.group<I>, id)); }
  list() { return this.client.execute({ operation: "listGroups", kind: this.kind }, decode.list(decode.group<I>)); }
  create(input: GroupInput) {
    return this.client.execute({ operation: "createGroup", kind: this.kind, input }, decode.group<I>);
  }
  update(id: I, expectedRevision: number, input: GroupInput) {
    return this.client.execute({ operation: "updateGroup", kind: this.kind, id, expectedRevision, input }, decode.identified(decode.group<I>, id, expectedRevision));
  }
  delete(id: I, expectedRevision: number) {
    return this.client.execute({ operation: "deleteGroup", kind: this.kind, id, expectedRevision }, decode.nothing);
  }
  getMembers(id: I) {
    return this.client.execute({ operation: "getMembers", kind: this.kind, id }, decode.membershipFor(id));
  }
  setMembers(id: I, expectedRevision: number, noteIds: readonly NoteId[]) {
    return this.client.execute({ operation: "setMembers", kind: this.kind, id, expectedRevision, noteIds }, decode.membershipFor(id, expectedRevision));
  }
}

/** App composition owns this factory result and injects individual contracts into
 * features. Construction performs no IO; the first explicit call opens storage.
 * Browser preview has no database substitute and rejects native operations.
 */
export function createDomainRepositories(nativeInvoke: NativeInvoke = invoke): DomainRepositories {
  const client = new NativeStoreClient(nativeInvoke);
  return {
    notes: new TauriNoteRepository(client),
    connections: new TauriConnectionRepository(client),
    collections: new TauriGroupRepository<CollectionId>(client, "collection"),
    threads: new TauriGroupRepository<ThreadId>(client, "thread"),
  };
}
