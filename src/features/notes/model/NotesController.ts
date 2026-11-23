import type { GroupRepository, NoteRepository } from "../../../data/contracts";
import type { JSONContent } from "@tiptap/core";
import {
  StoreError,
  type Note,
  type NoteId,
  type NoteInput,
  type NoteBody,
  type ThreadId,
  type JsonValue,
} from "../../../shared/domain";
import { copyTitle, emptyBody } from "./noteValues";
import { editorBody } from "./editorSchema";

interface BodyDraft {
  readonly body: NoteBody;
  /** Comparing the base prevents an explicit retry from overwriting an external edit. */
  readonly base: NoteBody;
}
export interface NoteThread {
  readonly id: ThreadId;
  readonly name: string;
  readonly position: number;
  readonly total: number;
}
/** Rust may reorder JSON object keys. Compare values, or readback of a committed
 * draft could look like an external edit and block recovery after a lost ack. */
function sameBody(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a))
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => sameBody(value, b[index]))
    );
  if (Array.isArray(b)) return false;
  const left = a as Record<string, JsonValue>;
  const right = b as Record<string, JsonValue>;
  return (
    Object.keys(left).length === Object.keys(right).length &&
    Object.keys(left).every(
      (key) => Object.hasOwn(right, key) && sameBody(left[key], right[key]),
    )
  );
}

type WriteState = "saving" | "saved" | "error";
interface UndoAction {
  readonly id: NoteId;
  readonly field: "isArchived" | "isDeleted";
  readonly previous: boolean;
  readonly message: string;
}
export interface NotesSnapshot {
  readonly notes: readonly Note[];
  readonly phase: "idle" | "loading" | "ready" | "error";
  readonly loadError: string | null;
  readonly error: string | null;
  readonly pending: boolean;
  /** A lost acknowledgement requires explicit readback before another write. */
  readonly uncertain: boolean;
  readonly drafts: Readonly<Record<string, string>>;
  readonly bodyDrafts: Readonly<Record<string, BodyDraft>>;
  readonly threads: Readonly<Record<string, readonly NoteThread[]>>;
  readonly contextErrors: Readonly<Record<string, string | null>>;
  readonly writes: Readonly<Record<string, WriteState>>;
  readonly undo: UndoAction | null;
}

function message(error: unknown): string {
  const code = error instanceof StoreError ? error.code : "unavailable";
  switch (code) {
    case "conflict":
      return "This note changed elsewhere. Your drafts are still here. Review the stored version before trying again.";
    case "busy":
      return "Storage is busy. Your changes are still here; try again.";
    case "invalidInput":
      return "The title must not contain NUL and must fit within 4096 UTF-8 bytes; the document must fit within 10 MiB.";
    case "notFound":
      return "This note is no longer available. Reload the library.";
    case "corruptDatabase":
      return "The library could not be read safely. Your stored data has been left intact.";
    case "incompatibleSchema":
      return "This library needs a compatible version of KNOT. Your stored data has been left intact.";
    default:
      return "Storage could not confirm the operation. Reload the library and check the result before trying again.";
  }
}

/**
 * App-owned, session-lived workflow. Constructors perform no IO or subscriptions.
 * Confirmed records and unsaved document drafts are separate so navigation/errors
 * cannot discard input. Writes are single-flight and never automatically retried.
 */
export class NotesController {
  private readonly listeners = new Set<() => void>();
  private generation = 0;
  private loading: Promise<void> | null = null;
  private snapshot: NotesSnapshot = {
    notes: [],
    phase: "idle",
    loadError: null,
    error: null,
    pending: false,
    uncertain: false,
    drafts: {},
    bodyDrafts: {},
    threads: {},
    contextErrors: {},
    writes: {},
    undo: null,
  };

  constructor(
    private readonly repository: NoteRepository,
    private readonly threadRepository?: Pick<
      GroupRepository<ThreadId>,
      "list" | "getMembers"
    >,
  ) {}

  /** Context is optional and independent of document loading/saving. No synthetic relationships. */
  async loadThreads(id: NoteId): Promise<void> {
    if (!this.threadRepository) return;
    try {
      const groups = await this.threadRepository.list();
      const memberships = await Promise.all(
        groups.map((group) => this.threadRepository!.getMembers(group.id)),
      );
      const threads: NoteThread[] = [];
      for (const { group, members } of memberships) {
        const index = members.findIndex((member) => member.noteId === id);
        if (index >= 0)
          threads.push({
            id: group.id,
            name: group.name,
            position: index + 1,
            total: members.length,
          });
      }
      this.publish({
        threads: { ...this.snapshot.threads, [id]: threads },
        contextErrors: { ...this.snapshot.contextErrors, [id]: null },
      });
    } catch {
      this.publish({
        contextErrors: {
          ...this.snapshot.contextErrors,
          [id]: "Thread context is unavailable. Your note is still editable.",
        },
      });
    }
  }

  getSnapshot = (): NotesSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(change: Partial<NotesSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((listener) => listener());
  }

  /** Strict Mode calls share the same read. A write invalidates an older read. */
  load = (): Promise<void> => {
    if (this.snapshot.pending) return Promise.resolve();
    if (this.loading) return this.loading;
    const generation = ++this.generation;
    this.publish({ phase: "loading", loadError: null });
    this.loading = this.repository
      .list()
      .then((notes) => {
        if (generation === this.generation)
          this.publish({ notes, phase: "ready", uncertain: false });
      })
      .catch((error: unknown) => {
        if (generation === this.generation)
          this.publish({ phase: "error", loadError: message(error) });
      })
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  };

  draft(id: NoteId, title: string): void {
    this.publish({ drafts: { ...this.snapshot.drafts, [id]: title } });
  }
  cancelDraft(id: NoteId): void {
    const drafts = { ...this.snapshot.drafts };
    delete drafts[id];
    this.publish({ drafts });
  }

  /** Drafts live with the application, not the mounted editor. Navigation cannot discard text. */
  draftBody(id: NoteId, document: JSONContent): void {
    const note = this.find(id);
    if (!note || note.deletedAt !== null) return;
    const previous = this.snapshot.bodyDrafts[id];
    const body = editorBody(document, previous?.body ?? note.body);
    this.publish({
      bodyDrafts: {
        ...this.snapshot.bodyDrafts,
        [id]: { body, base: previous?.base ?? note.body },
      },
    });
  }

  cancelBodyDraft(id: NoteId): void {
    const bodyDrafts = { ...this.snapshot.bodyDrafts };
    delete bodyDrafts[id];
    this.publish({ bodyDrafts });
  }

  hasBodyConflict(id: NoteId): boolean {
    const note = this.find(id);
    const draft = this.snapshot.bodyDrafts[id];
    return (
      !!note &&
      !!draft &&
      !sameBody(note.body, draft.base) &&
      !sameBody(note.body, draft.body)
    );
  }

  saveBody(id: NoteId): Promise<Note | null> {
    const note = this.find(id);
    const draft = this.snapshot.bodyDrafts[id];
    if (!note || !draft || note.deletedAt !== null)
      return Promise.resolve(null);
    if (this.hasBodyConflict(id)) {
      this.publish({
        error:
          "The stored body changed elsewhere. Your local text is preserved. Copy it for comparison, or discard body changes to use the stored version.",
      });
      return Promise.resolve(null);
    }
    const body = { ...note.body, document: draft.body.document };
    if (
      new TextEncoder().encode(JSON.stringify(body)).length >
      10 * 1024 * 1024
    ) {
      this.publish({ error: message(new StoreError("invalidInput")) });
      return Promise.resolve(null);
    }
    return this.update(note, { body }).then((saved) => {
      if (saved) {
        const current = this.snapshot.bodyDrafts[id];
        if (current === draft) this.cancelBodyDraft(id);
        else if (current)
          this.publish({
            bodyDrafts: {
              ...this.snapshot.bodyDrafts,
              [id]: { ...current, base: saved.body },
            },
          });
      }
      return saved;
    });
  }
  dismissError = (): void => {
    this.publish({ error: null });
  };
  dismissUndo = (): void => {
    this.publish({ undo: null });
  };

  create = (): Promise<Note | null> =>
    this.write(null, () =>
      this.repository.create({
        title: "",
        body: emptyBody,
        isFavorite: false,
        isArchived: false,
        isDeleted: false,
      }),
    );

  duplicate(id: NoteId): Promise<Note | null> {
    const note = this.find(id);
    if (!note || note.deletedAt !== null) return Promise.resolve(null);
    return this.write(null, () =>
      this.repository.create({
        title: copyTitle(note.title),
        body: note.body,
        isFavorite: false,
        isArchived: false,
        isDeleted: false,
      }),
    );
  }

  rename(id: NoteId): Promise<Note | null> {
    const note = this.find(id);
    const title = this.snapshot.drafts[id];
    if (!note || title === undefined || note.deletedAt !== null)
      return Promise.resolve(null);
    if (new TextEncoder().encode(title).length > 4096 || title.includes("\0")) {
      this.publish({ error: message(new StoreError("invalidInput")) });
      return Promise.resolve(null);
    }
    return this.update(note, { title }).then((saved) => {
      // Keep a draft typed while the request was in flight.
      if (saved && this.snapshot.drafts[id] === title) this.cancelDraft(id);
      return saved;
    });
  }

  favorite(id: NoteId): Promise<Note | null> {
    const note = this.find(id);
    return note && note.deletedAt === null
      ? this.update(note, { isFavorite: !note.isFavorite })
      : Promise.resolve(null);
  }
  archive(id: NoteId): Promise<Note | null> {
    const note = this.find(id);
    if (!note || note.deletedAt !== null) return Promise.resolve(null);
    return this.changeStatus(
      note,
      "isArchived",
      note.archivedAt === null,
      note.archivedAt === null
        ? "Note archived."
        : "Note restored from archive.",
    );
  }
  trash(id: NoteId): Promise<Note | null> {
    const note = this.find(id);
    if (!note || note.deletedAt !== null) return Promise.resolve(null);
    return this.changeStatus(note, "isDeleted", true, "Note moved to trash.");
  }
  restore(id: NoteId): Promise<Note | null> {
    const note = this.find(id);
    if (!note || note.deletedAt === null) return Promise.resolve(null);
    return this.changeStatus(
      note,
      "isDeleted",
      false,
      "Note restored from trash.",
    );
  }
  undo = async (): Promise<void> => {
    const undo = this.snapshot.undo;
    if (!undo) return;
    const note = this.find(undo.id);
    if (!note) return;
    // Apply only the inverse flag to the current confirmed record. Never restore
    // a stale full-document snapshot over a newer title or body.
    const saved = await this.update(note, { [undo.field]: undo.previous });
    if (saved) this.publish({ undo: null });
  };

  private find(id: NoteId): Note | undefined {
    return this.snapshot.notes.find((note) => note.id === id);
  }
  private async changeStatus(
    note: Note,
    field: UndoAction["field"],
    value: boolean,
    text: string,
  ): Promise<Note | null> {
    const previous =
      field === "isArchived"
        ? note.archivedAt !== null
        : note.deletedAt !== null;
    const saved = await this.update(note, { [field]: value });
    if (saved)
      this.publish({ undo: { id: note.id, field, previous, message: text } });
    return saved;
  }
  private update(note: Note, patch: Partial<NoteInput>): Promise<Note | null> {
    return this.write(note.id, () =>
      this.repository.update(note.id, note.revision, {
        title: note.title,
        body: note.body,
        isFavorite: note.isFavorite,
        isArchived: note.archivedAt !== null,
        isDeleted: note.deletedAt !== null,
        ...patch,
      }),
    );
  }
  private async write(
    id: NoteId | null,
    operation: () => Promise<Note>,
  ): Promise<Note | null> {
    if (
      this.snapshot.pending ||
      this.snapshot.uncertain ||
      this.snapshot.phase !== "ready"
    )
      return null;
    ++this.generation;
    this.publish({
      pending: true,
      error: null,
      writes: id
        ? { ...this.snapshot.writes, [id]: "saving" }
        : this.snapshot.writes,
    });
    try {
      const saved = await operation();
      this.publish({
        notes: [
          ...this.snapshot.notes.filter((note) => note.id !== saved.id),
          saved,
        ],
        writes: { ...this.snapshot.writes, [saved.id]: "saved" },
      });
      return saved;
    } catch (error) {
      const code = error instanceof StoreError ? error.code : "unavailable";
      const uncertain = ["unavailable", "invalidResponse", "internal"].includes(
        code,
      );
      this.publish({
        error: message(error),
        uncertain,
        writes: id
          ? { ...this.snapshot.writes, [id]: "error" }
          : this.snapshot.writes,
      });
      if (code === "conflict" || code === "notFound") {
        this.publish({ pending: false });
        await this.load();
      }
      return null;
    } finally {
      this.publish({ pending: false });
    }
  }
}
