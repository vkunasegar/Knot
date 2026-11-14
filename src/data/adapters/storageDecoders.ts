import { StoreError } from "../../shared/domain";
import type { Connection, Group, GroupId, MembershipSnapshot, Note } from "../../shared/domain";

type ObjectValue = Record<string, unknown>;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isId = (value: unknown): value is string => typeof value === "string" && idPattern.test(value)
  && value !== "00000000-0000-0000-0000-000000000000";
const isInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const isText = (value: unknown, bytes: number): value is string => typeof value === "string"
  && !value.includes("\0") && new TextEncoder().encode(value).length <= bytes;

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new StoreError("invalidResponse");
}
function object(value: unknown): ObjectValue {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as ObjectValue;
}
function metadata(value: unknown): ObjectValue {
  const row = object(value);
  requireValue(isId(row.id) && isInteger(row.createdAt) && isInteger(row.updatedAt)
    && row.updatedAt >= row.createdAt && isInteger(row.revision) && row.revision > 0);
  return row;
}

/** Reject lossy JSON (NaN, undefined, cycles, class instances) before IPC. Otherwise
 * JSON encoding could silently replace document values while reporting success.
 * The same check protects native response boundaries before type narrowing.
 */
export function assertJson(value: unknown, ancestors = new Set<object>(), depth = 0): void {
  if (value === null || typeof value === "boolean" || typeof value === "string") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || depth > 100 || ancestors.has(value)) throw new StoreError("invalidInput");
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype
    && Object.getPrototypeOf(value) !== null) throw new StoreError("invalidInput");
  ancestors.add(value);
  // Array.from includes sparse slots, which JSON would silently turn into null.
  for (const child of Array.isArray(value) ? Array.from(value) : Object.values(value)) assertJson(child, ancestors, depth + 1);
  ancestors.delete(value);
}

export function note(value: unknown): Note {
  const row = metadata(value);
  const body = object(row.body);
  requireValue(isText(row.title, 4096) && typeof row.isFavorite === "boolean"
    && (row.archivedAt === null || isInteger(row.archivedAt))
    && (row.deletedAt === null || isInteger(row.deletedAt))
    && body.version === 1 && object(body.document).type === "doc"
    && new TextEncoder().encode(JSON.stringify(body)).length <= 10 * 1024 * 1024);
  return value as Note;
}
export function group<I extends GroupId>(value: unknown): Group<I> {
  const row = metadata(value);
  requireValue(isText(row.name, 4096) && row.name.trim().length > 0 && isText(row.description, 65536));
  return value as Group<I>;
}
export function connection(value: unknown): Connection {
  const row = metadata(value);
  requireValue(isId(row.sourceNoteId) && isId(row.targetNoteId) && row.sourceNoteId !== row.targetNoteId
    && ["related", "supports", "contradicts", "references"].includes(row.kind as string)
    && ["directed", "undirected"].includes(row.direction as string)
    && (row.direction !== "undirected" || row.sourceNoteId < row.targetNoteId)
    && typeof row.strength === "number" && Number.isFinite(row.strength) && row.strength >= 0 && row.strength <= 1);
  return value as Connection;
}
export function members<I extends GroupId>(value: unknown): MembershipSnapshot<I> {
  const row = object(value);
  group<I>(row.group);
  requireValue(Array.isArray(row.members));
  const seen = new Set<string>();
  let previous = -1;
  for (const member of row.members) {
    const entry = object(member);
    requireValue(isId(entry.noteId) && !seen.has(entry.noteId) && isInteger(entry.position) && entry.position > previous);
    seen.add(entry.noteId);
    previous = entry.position;
  }
  return value as MembershipSnapshot<I>;
}
export function list<T>(decoder: (item: unknown) => T): (value: unknown) => readonly T[] {
  return (value) => { requireValue(Array.isArray(value)); return value.map(decoder); };
}
export function nothing(value: unknown): void { requireValue(value === null); }

/** A valid entity of the wrong identity/revision is still an invalid save ack. */
export function identified<T extends { readonly id: string; readonly revision: number }>(
  decoder: (value: unknown) => T, id: string, previousRevision?: number,
): (value: unknown) => T {
  return (value) => {
    const result = decoder(value);
    requireValue(result.id === id && (previousRevision === undefined || result.revision === previousRevision + 1));
    return result;
  };
}
export function membershipFor<I extends GroupId>(id: I, previousRevision?: number) {
  return (value: unknown): MembershipSnapshot<I> => {
    const result = members<I>(value);
    identified(group<I>, id, previousRevision)(result.group);
    return result;
  };
}
