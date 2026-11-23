import { describe, expect, it, vi } from "vitest";
import {
  MemoryNoteRepository,
  sampleNote,
} from "../../../../tests/fixtures/MemoryNoteRepository";
import { richBody } from "../../../../tests/fixtures/richText";
import type { ThreadId } from "../../../shared/domain";
import { NotesController } from "./NotesController";
import { editableDocument } from "./editorSchema";

async function setup() {
  const note = sampleNote();
  const repository = new MemoryNoteRepository([note]);
  const controller = new NotesController(repository);
  await controller.load();
  return { note, repository, controller };
}
const document = (text: string) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("document draft lifecycle", () => {
  it("saves rich formatting and envelope metadata across a new controller, independently of title drafts", async () => {
    const { note, repository, controller } = await setup();
    controller.draft(note.id, "Unsaved title");
    const mixed = editableDocument(richBody)!;
    controller.draftBody(note.id, mixed);
    await controller.saveBody(note.id);
    expect(controller.getSnapshot().drafts[note.id]).toBe("Unsaved title");
    expect(controller.getSnapshot().bodyDrafts[note.id]).toBeUndefined();
    const restarted = new NotesController(repository);
    await restarted.load();
    expect(restarted.getSnapshot().notes[0]).toMatchObject({
      title: note.title,
      body: { document: mixed, futureMetadata: { keep: true } },
    });
  });

  it("retains a body draft through title/status writes, failed saves and reloading", async () => {
    const { note, repository, controller } = await setup();
    controller.draftBody(note.id, document("Still here"));
    controller.draft(note.id, "New title");
    await controller.rename(note.id);
    await controller.favorite(note.id);
    repository.failNextWrite = "busy";
    expect(await controller.saveBody(note.id)).toBeNull();
    await controller.load();
    expect(controller.getSnapshot().bodyDrafts[note.id].body.document).toEqual(
      document("Still here"),
    );
    expect((await repository.get(note.id)).body).toEqual(note.body);
    await controller.saveBody(note.id);
    expect(await repository.get(note.id)).toMatchObject({
      title: "New title",
      isFavorite: true,
      body: { document: document("Still here") },
    });
  });

  it("keeps edits typed during a slow save and rebases them onto the acknowledged revision", async () => {
    const { note, repository, controller } = await setup();
    const original = repository.update.bind(repository);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(repository, "update").mockImplementation(async (...args) => {
      await gate;
      return original(...args);
    });
    controller.draftBody(note.id, document("Submitted"));
    const saving = controller.saveBody(note.id);
    controller.draftBody(note.id, document("Continued typing"));
    expect(await controller.saveBody(note.id)).toBeNull();
    release();
    await saving;
    expect((await repository.get(note.id)).body.document).toEqual(
      document("Submitted"),
    );
    expect(controller.getSnapshot().bodyDrafts[note.id].body.document).toEqual(
      document("Continued typing"),
    );
    expect(controller.hasBodyConflict(note.id)).toBe(false);
    await controller.saveBody(note.id);
    expect((await repository.get(note.id)).body.document).toEqual(
      document("Continued typing"),
    );
  });

  it("preserves both versions after a conflict and refuses a blind retry", async () => {
    const { note, repository, controller } = await setup();
    controller.draftBody(note.id, document("Local text"));
    await repository.update(note.id, note.revision, {
      title: note.title,
      body: { ...note.body, document: document("External text") },
      isFavorite: false,
      isArchived: false,
      isDeleted: false,
    });
    expect(await controller.saveBody(note.id)).toBeNull();
    expect(controller.hasBodyConflict(note.id)).toBe(true);
    const write = vi.spyOn(repository, "update");
    expect(await controller.saveBody(note.id)).toBeNull();
    expect(write).not.toHaveBeenCalled();
    expect((await repository.get(note.id)).body.document).toEqual(
      document("External text"),
    );
    expect(controller.getSnapshot().bodyDrafts[note.id].body.document).toEqual(
      document("Local text"),
    );
    controller.cancelBodyDraft(note.id);
    expect(controller.getSnapshot().bodyDrafts[note.id]).toBeUndefined();
  });

  it("requires readback after an unknown outcome and keeps the body until acknowledgement", async () => {
    const { note, repository, controller } = await setup();
    controller.draftBody(
      note.id,
      document("Committed before transport failed"),
    );
    repository.loseNextAcknowledgement = true;
    expect(await controller.saveBody(note.id)).toBeNull();
    expect(controller.getSnapshot().uncertain).toBe(true);
    expect(await controller.saveBody(note.id)).toBeNull();
    expect(controller.getSnapshot().bodyDrafts[note.id]).toBeDefined();
    await controller.load();
    expect(controller.hasBodyConflict(note.id)).toBe(false);
    await controller.saveBody(note.id);
    expect(controller.getSnapshot().bodyDrafts[note.id]).toBeUndefined();
  });

  it("does not send oversized bodies and never edits trashed notes", async () => {
    const { note, repository, controller } = await setup();
    const write = vi.spyOn(repository, "update");
    controller.draftBody(note.id, document("x".repeat(10 * 1024 * 1024)));
    expect(await controller.saveBody(note.id)).toBeNull();
    expect(write).not.toHaveBeenCalled();
    expect(controller.getSnapshot().error).toContain("10 MiB");
    controller.cancelBodyDraft(note.id);
    await controller.trash(note.id);
    controller.draftBody(note.id, document("Forbidden"));
    expect(controller.getSnapshot().bodyDrafts[note.id]).toBeUndefined();
    expect(await controller.saveBody(note.id)).toBeNull();
  });

  it("shows only real ordered thread membership and isolates context failures", async () => {
    const { note, repository } = await setup();
    const thread = {
      id: "thread-1" as ThreadId,
      name: "A real thought path",
      description: "",
      revision: 1,
      createdAt: 0,
      updatedAt: 0,
    };
    const threads = {
      list: vi.fn().mockResolvedValue([thread]),
      getMembers: vi.fn().mockResolvedValue({
        group: thread,
        members: [
          { noteId: "other", position: 0 },
          { noteId: note.id, position: 12 },
        ],
      }),
    };
    const controller = new NotesController(repository, threads);
    await controller.load();
    await controller.loadThreads(note.id);
    expect(controller.getSnapshot().threads[note.id]).toEqual([
      { id: thread.id, name: thread.name, position: 2, total: 2 },
    ]);
    threads.getMembers.mockRejectedValueOnce(new Error("Offline"));
    await controller.loadThreads(note.id);
    expect(controller.getSnapshot().contextErrors[note.id]).toContain(
      "unavailable",
    );
    controller.draftBody(note.id, document("Still editable"));
    expect(await controller.saveBody(note.id)).not.toBeNull();
  });
});
