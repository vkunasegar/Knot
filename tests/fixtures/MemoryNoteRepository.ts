import type { NoteRepository } from "../../src/data/contracts";
import {
  StoreError,
  type Note,
  type NoteId,
  type NoteInput,
  type StoreErrorCode,
} from "../../src/shared/domain";

/** Test-only contract double. Native SQLite tests establish actual durability. */
export class MemoryNoteRepository implements NoteRepository {
  private records: Note[];
  failNextWrite: StoreErrorCode | null = null;
  failNextRead: StoreErrorCode | null = null;
  loseNextAcknowledgement = false;

  constructor(
    initial: readonly Note[] = [],
    private readonly persist?: (notes: readonly Note[]) => void,
  ) {
    this.records = structuredClone([...initial]);
  }
  async list(): Promise<readonly Note[]> {
    if (this.failNextRead) {
      const code = this.failNextRead;
      this.failNextRead = null;
      throw new StoreError(code);
    }
    return structuredClone(this.records);
  }
  async get(id: NoteId): Promise<Note> {
    const note = this.records.find((record) => record.id === id);
    if (!note) throw new StoreError("notFound");
    return structuredClone(note);
  }
  async create(input: NoteInput): Promise<Note> {
    this.checkWrite();
    const timestamp = Date.now();
    const note: Note = {
      id: crypto.randomUUID() as NoteId,
      title: input.title,
      body: structuredClone(input.body),
      isFavorite: input.isFavorite,
      archivedAt: input.isArchived ? timestamp : null,
      deletedAt: input.isDeleted ? timestamp : null,
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 1,
    };
    this.records.push(note);
    this.commit();
    return structuredClone(note);
  }
  async update(
    id: NoteId,
    expectedRevision: number,
    input: NoteInput,
  ): Promise<Note> {
    this.checkWrite();
    const old = await this.get(id);
    if (old.revision !== expectedRevision) throw new StoreError("conflict");
    const timestamp = Math.max(Date.now(), old.updatedAt);
    const note: Note = {
      ...old,
      title: input.title,
      body: structuredClone(input.body),
      isFavorite: input.isFavorite,
      archivedAt: input.isArchived ? (old.archivedAt ?? timestamp) : null,
      deletedAt: input.isDeleted ? (old.deletedAt ?? timestamp) : null,
      updatedAt: timestamp,
      revision: old.revision + 1,
    };
    this.records = this.records.map((record) =>
      record.id === id ? note : record,
    );
    this.commit();
    return structuredClone(note);
  }
  async purge(id: NoteId, revision: number): Promise<void> {
    const note = await this.get(id);
    if (note.revision !== revision || note.deletedAt === null)
      throw new StoreError("conflict");
    this.records = this.records.filter((record) => record.id !== id);
    this.commit();
  }
  private checkWrite(): void {
    if (this.failNextWrite) {
      const code = this.failNextWrite;
      this.failNextWrite = null;
      throw new StoreError(code);
    }
  }
  private commit(): void {
    this.persist?.(structuredClone(this.records));
    if (this.loseNextAcknowledgement) {
      this.loseNextAcknowledgement = false;
      throw new StoreError("unavailable");
    }
  }
}

export function sampleNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "f29fb971-3271-43cf-83a1-e66d324e6871" as NoteId,
    title: "A thought worth keeping",
    body: {
      version: 1,
      document: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Every thought is a thread." }],
          },
        ],
      },
      futureMetadata: { keep: true },
    },
    createdAt: 1_794_800_000_000,
    updatedAt: 1_794_800_000_000,
    revision: 1,
    isFavorite: false,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
