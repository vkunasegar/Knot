import { describe, expect, it, vi } from "vitest";
import {
  MemoryNoteRepository,
  sampleNote,
} from "../../../../tests/fixtures/MemoryNoteRepository";
import type { NoteInput } from "../../../shared/domain";
import { NotesController } from "./NotesController";
import { copyTitle, documentText, visibleNotes } from "./noteValues";

async function setup() {
  const note = sampleNote();
  const repository = new MemoryNoteRepository([note]);
  const controller = new NotesController(repository);
  await controller.load();
  return { note, repository, controller };
}
const input = (note: ReturnType<typeof sampleNote>): NoteInput => ({
  title: note.title,
  body: note.body,
  isFavorite: note.isFavorite,
  isArchived: note.archivedAt !== null,
  isDeleted: note.deletedAt !== null,
});

describe("NotesController", () => {
  it("creates only after loading and publishes confirmed results", async () => {
    const repository = new MemoryNoteRepository();
    const controller = new NotesController(repository);
    expect(await controller.create()).toBeNull();
    await controller.load();
    const created = await controller.create();
    expect(created).toMatchObject({
      title: "",
      isFavorite: false,
      archivedAt: null,
      deletedAt: null,
    });
    expect(controller.getSnapshot().writes[created!.id]).toBe("saved");
    expect(await repository.list()).toHaveLength(1);
  });

  it("shares Strict Mode reads and blocks duplicate in-flight creation", async () => {
    const { controller, repository } = await setup();
    const read = vi.spyOn(repository, "list");
    const first = controller.load();
    expect(controller.load()).toBe(first);
    await first;
    expect(read).toHaveBeenCalledTimes(1);
    const create = vi.spyOn(repository, "create");
    const pending = controller.create();
    expect(await controller.create()).toBeNull();
    await pending;
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("preserves unknown body metadata through title, favorite, archive, trash and restore", async () => {
    const { controller, repository, note } = await setup();
    controller.draft(note.id, "Über den Faden 🧶");
    await controller.rename(note.id);
    await controller.favorite(note.id);
    await controller.archive(note.id);
    await controller.trash(note.id);
    expect(
      visibleNotes(controller.getSnapshot().notes, "notes", "updated"),
    ).toEqual([]);
    expect(
      visibleNotes(controller.getSnapshot().notes, "favorites", "updated"),
    ).toEqual([]);
    expect(
      visibleNotes(controller.getSnapshot().notes, "archive", "updated"),
    ).toEqual([]);
    const restarted = new NotesController(repository);
    await restarted.load();
    await restarted.restore(note.id);
    const restored = await repository.get(note.id);
    expect(restored).toMatchObject({
      title: "Über den Faden 🧶",
      body: note.body,
      isFavorite: true,
      deletedAt: null,
    });
    expect(restored.archivedAt).not.toBeNull();
    await restarted.archive(note.id);
    expect(
      visibleNotes(restarted.getSnapshot().notes, "favorites", "updated"),
    ).toHaveLength(1);
  });

  it("duplicates the full document into an independent active nonfavorite note", async () => {
    const { controller, note, repository } = await setup();
    await controller.favorite(note.id);
    await controller.archive(note.id);
    const copy = await controller.duplicate(note.id);
    expect(copy).toMatchObject({
      title: `${note.title} (copy)`,
      body: note.body,
      isFavorite: false,
      archivedAt: null,
      deletedAt: null,
    });
    expect(copy!.id).not.toBe(note.id);
    expect((await repository.get(note.id)).isFavorite).toBe(true);
  });

  it("retains title drafts and confirmed data on failure and allows explicit retry", async () => {
    const { controller, repository, note } = await setup();
    controller.draft(note.id, "Still here");
    repository.failNextWrite = "busy";
    expect(await controller.rename(note.id)).toBeNull();
    expect(controller.getSnapshot()).toMatchObject({
      drafts: { [note.id]: "Still here" },
      writes: { [note.id]: "error" },
      uncertain: false,
    });
    expect((await repository.get(note.id)).title).toBe(note.title);
    await controller.rename(note.id);
    expect((await repository.get(note.id)).title).toBe("Still here");
    expect(controller.getSnapshot().drafts[note.id]).toBeUndefined();
  });

  it("reloads conflicts without overwriting newer content or losing the title draft", async () => {
    const { controller, repository, note } = await setup();
    const newerBody = { ...note.body, futureMetadata: { externalEdit: true } };
    await repository.update(note.id, note.revision, {
      ...input(note),
      title: "Changed elsewhere",
      body: newerBody,
    });
    controller.draft(note.id, "Local title");
    expect(await controller.rename(note.id)).toBeNull();
    expect(controller.getSnapshot().notes[0]).toMatchObject({
      title: "Changed elsewhere",
      body: newerBody,
    });
    expect(controller.getSnapshot().drafts[note.id]).toBe("Local title");
    await controller.rename(note.id);
    expect(await repository.get(note.id)).toMatchObject({
      title: "Local title",
      body: newerBody,
    });
  });

  it("requires readback after a lost create acknowledgement and never automatically creates a second note", async () => {
    const { controller, repository } = await setup();
    repository.loseNextAcknowledgement = true;
    expect(await controller.create()).toBeNull();
    expect(controller.getSnapshot().uncertain).toBe(true);
    expect(await controller.create()).toBeNull();
    expect(await repository.list()).toHaveLength(2);
    await controller.load();
    expect(controller.getSnapshot()).toMatchObject({
      uncertain: false,
      phase: "ready",
    });
    expect(controller.getSnapshot().notes).toHaveLength(2);
  });

  it("undo changes only the status and preserves a subsequent title edit", async () => {
    const { controller, repository, note } = await setup();
    await controller.archive(note.id);
    controller.draft(note.id, "A newer title");
    await controller.rename(note.id);
    await controller.undo();
    expect(await repository.get(note.id)).toMatchObject({
      title: "A newer title",
      body: note.body,
      archivedAt: null,
    });
    expect(controller.getSnapshot().undo).toBeNull();
    await controller.trash(note.id);
    repository.failNextWrite = "busy";
    await controller.undo();
    expect(controller.getSnapshot().undo).not.toBeNull();
    expect((await repository.get(note.id)).deletedAt).not.toBeNull();
  });

  it("recovers a failed load without inventing an empty library", async () => {
    const repository = new MemoryNoteRepository([sampleNote()]);
    repository.failNextRead = "corruptDatabase";
    const controller = new NotesController(repository);
    await controller.load();
    expect(controller.getSnapshot()).toMatchObject({
      phase: "error",
      loadError: expect.stringContaining("left intact"),
    });
    expect(await controller.create()).toBeNull();
    await controller.load();
    expect(controller.getSnapshot().notes).toHaveLength(1);
  });

  it("validates UTF-8 title limits and NUL without sending invalid writes", async () => {
    const { controller, repository, note } = await setup();
    const update = vi.spyOn(repository, "update");
    for (const title of ["🧶".repeat(1025), "bad\0title"]) {
      controller.draft(note.id, title);
      expect(await controller.rename(note.id)).toBeNull();
      expect(controller.getSnapshot().drafts[note.id]).toBe(title);
    }
    expect(update).not.toHaveBeenCalled();
    controller.draft(note.id, "🧶".repeat(1024));
    await controller.rename(note.id);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not discard a draft typed while a save is pending", async () => {
    const { controller, repository, note } = await setup();
    const original = repository.update.bind(repository);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(repository, "update").mockImplementation(async (...args) => {
      await gate;
      return original(...args);
    });
    controller.draft(note.id, "Submitted");
    const save = controller.rename(note.id);
    controller.draft(note.id, "Continued typing");
    release();
    await save;
    expect(controller.getSnapshot().drafts[note.id]).toBe("Continued typing");
    expect((await repository.get(note.id)).title).toBe("Submitted");
  });
});

describe("note values", () => {
  it("sorts and filters active, favorite, archive and trash independently", () => {
    const a = sampleNote({ title: "Zebra", isFavorite: true });
    const b = sampleNote({
      id: "d97330ce-68cf-4860-937c-59ba8684d342" as typeof a.id,
      title: "Apple",
      updatedAt: a.updatedAt + 1,
    });
    const archived = sampleNote({ archivedAt: 123, isFavorite: true });
    const trashed = sampleNote({ archivedAt: 123, deletedAt: 234 });
    const notes = [a, b, archived, trashed];
    expect(visibleNotes(notes, "notes", "title")).toEqual([b, a]);
    expect(visibleNotes(notes, "favorites", "updated")).toEqual([a]);
    expect(visibleNotes(notes, "archive", "updated")).toEqual([archived]);
    expect(visibleNotes(notes, "trash", "updated")).toEqual([trashed]);
  });
  it("extracts safe text without treating attributes or HTML as executable markup", () => {
    const body = sampleNote().body;
    expect(documentText(body)).toBe("Every thought is a thread.");
    expect(
      documentText({
        ...body,
        document: {
          type: "doc",
          content: [
            { type: "image", attrs: { src: "javascript:alert(1)" } },
            { type: "text", text: "<script>alert(1)</script>" },
          ],
        },
      }),
    ).toBe("<script>alert(1)</script>");
  });
  it("keeps copied long Unicode titles within the storage boundary", () => {
    const title = copyTitle("🧶".repeat(1024));
    expect(new TextEncoder().encode(title).length).toBeLessThanOrEqual(4096);
    expect(title.endsWith(" (copy)")).toBe(true);
    expect(title).not.toContain("�");
  });
});
