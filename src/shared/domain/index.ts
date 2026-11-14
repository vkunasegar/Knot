/** Platform-neutral, opaque identities. Only persistence creates entity IDs. */
declare const entity: unique symbol;
export type EntityId<K extends string> = string & { readonly [entity]: K };
export type NoteId = EntityId<"note">;
export type ConnectionId = EntityId<"connection">;
export type CollectionId = EntityId<"collection">;
export type ThreadId = EntityId<"thread">;
export type GroupId = CollectionId | ThreadId;

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
/** Storage owns the envelope version; the editor owns the document schema. */
export interface NoteBody {
  readonly version: 1;
  readonly document: { readonly type: "doc"; readonly [key: string]: JsonValue };
  readonly [key: string]: JsonValue;
}

/** Native epoch milliseconds and a monotonic compare-and-swap revision. */
export interface RecordMetadata<I> {
  readonly id: I;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly revision: number;
}
export interface Note extends RecordMetadata<NoteId> {
  readonly title: string;
  readonly body: NoteBody;
  readonly isFavorite: boolean;
  readonly archivedAt: number | null;
  readonly deletedAt: number | null;
}
export interface NoteInput {
  readonly title: string;
  readonly body: NoteBody;
  readonly isFavorite: boolean;
  readonly isArchived: boolean;
  readonly isDeleted: boolean;
}
export interface GroupInput { readonly name: string; readonly description: string }
export interface Group<I extends GroupId> extends RecordMetadata<I>, GroupInput {}
export type Collection = Group<CollectionId>;
export type Thread = Group<ThreadId>;
/** Identity is (parent ID, noteId). Position is ordered, unique, and may have gaps. */
export interface Membership { readonly noteId: NoteId; readonly position: number }
export interface MembershipSnapshot<I extends GroupId> {
  readonly group: Group<I>;
  readonly members: readonly Membership[];
}
export type ConnectionKind = "related" | "supports" | "contradicts" | "references";
export type ConnectionDirection = "directed" | "undirected";
export interface ConnectionInput {
  readonly sourceNoteId: NoteId;
  readonly targetNoteId: NoteId;
  readonly kind: ConnectionKind;
  readonly direction: ConnectionDirection;
  /** Finite normalized weight in [0, 1]. */
  readonly strength: number;
}
export interface Connection extends RecordMetadata<ConnectionId>, ConnectionInput {}

export type StoreErrorCode = "invalidInput" | "notFound" | "conflict" | "busy" | "unavailable"
  | "incompatibleSchema" | "corruptDatabase" | "internal" | "invalidResponse";

/** Features may branch on code; native details and document data stay private. */
export class StoreError extends Error {
  constructor(readonly code: StoreErrorCode) {
    super(`Storage operation failed: ${code}`);
    this.name = "StoreError";
  }
}
