import type {
  CollectionId, Connection, ConnectionId, ConnectionInput, Group, GroupId, GroupInput,
  MembershipSnapshot, Note, NoteId, NoteInput, ThreadId,
} from "../../shared/domain";

/** Promises resolve only after native commit and response validation. Rejections
 * are StoreError values. Never infer 'saved' from a queued or optimistic mutation.
 * Transport interruption can leave the outcome unknown: read back before retrying
 * a create. These contracts never automatically retry writes or cache documents.
 */
export interface NoteRepository {
  get(id: NoteId): Promise<Note>;
  /** Complete durable inventory, including archive/trash; workflows filter it. */
  list(): Promise<readonly Note[]>;
  create(input: NoteInput): Promise<Note>;
  update(id: NoteId, expectedRevision: number, input: NoteInput): Promise<Note>;
  /** Requires an already trashed note; cascades only its links/memberships. */
  purge(id: NoteId, expectedRevision: number): Promise<void>;
}
export interface ConnectionRepository {
  get(id: ConnectionId): Promise<Connection>;
  list(): Promise<readonly Connection[]>;
  create(input: ConnectionInput): Promise<Connection>;
  update(id: ConnectionId, expectedRevision: number, input: ConnectionInput): Promise<Connection>;
  delete(id: ConnectionId, expectedRevision: number): Promise<void>;
}
/** Metadata and membership changes share the parent's revision. A caller must
 * reload after conflict; blindly repeating a stale ordered list would lose edits.
 */
export interface GroupRepository<I extends GroupId> {
  get(id: I): Promise<Group<I>>;
  list(): Promise<readonly Group<I>[]>;
  create(input: GroupInput): Promise<Group<I>>;
  update(id: I, expectedRevision: number, input: GroupInput): Promise<Group<I>>;
  /** Deletes the container and its memberships, preserving every note. */
  delete(id: I, expectedRevision: number): Promise<void>;
  getMembers(id: I): Promise<MembershipSnapshot<I>>;
  /** Atomic membership CRUD: add, reorder, remove; [] clears the group. Each
   * note appears at most once per group, but may belong to any number of groups.
   */
  setMembers(id: I, expectedRevision: number, noteIds: readonly NoteId[]): Promise<MembershipSnapshot<I>>;
}
export interface DomainRepositories {
  readonly notes: NoteRepository;
  readonly connections: ConnectionRepository;
  readonly collections: GroupRepository<CollectionId>;
  readonly threads: GroupRepository<ThreadId>;
}
