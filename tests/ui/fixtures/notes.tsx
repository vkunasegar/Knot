/** Isolated test build entry. No test repository or controls enter native/release builds. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../../../src/app";
import { NotesController } from "../../../src/features/notes";
import type {
  Note,
  NoteId,
  NoteBody,
  StoreErrorCode,
  ThreadId,
} from "../../../src/shared/domain";
import { richBody } from "../../fixtures/richText";
import {
  MemoryNoteRepository,
  sampleNote,
} from "../../fixtures/MemoryNoteRepository";

declare global {
  interface Window {
    knotNotesTest: {
      failNextWrite: (code: StoreErrorCode) => void;
      loseAcknowledgement: () => void;
      list: () => Promise<readonly Note[]>;
      replaceBody: (body: NoteBody) => Promise<void>;
      richBody: NoteBody;
    };
  }
}
const key = "knot.notes.test-fixture.v1";
const saved = sessionStorage.getItem(key);
const repository = new MemoryNoteRepository(
  saved
    ? (JSON.parse(saved) as Note[])
    : [
        sampleNote(),
        sampleNote({
          id: "29b1fda3-df15-46da-83ed-cd4d4cbbe267" as NoteId,
          title: "Small observations",
          isFavorite: true,
          body: {
            version: 1,
            document: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "The morning light on the desk. An idea that arrives on the walk home. A few words are enough to begin.",
                    },
                  ],
                },
              ],
            },
          },
        }),
      ],
  (notes) => sessionStorage.setItem(key, JSON.stringify(notes)),
);
window.knotNotesTest = {
  failNextWrite: (code) => {
    repository.failNextWrite = code;
  },
  loseAcknowledgement: () => {
    repository.loseNextAcknowledgement = true;
  },
  list: () => repository.list(),
  richBody,
  replaceBody: async (body) => {
    const note = await repository.get(sampleNote().id);
    await repository.update(note.id, note.revision, {
      title: note.title,
      body,
      isFavorite: note.isFavorite,
      isArchived: note.archivedAt !== null,
      isDeleted: note.deletedAt !== null,
    });
  },
};
const thread = {
  id: "9c607a10-4c62-4407-9df6-732f8ce2d964" as ThreadId,
  name: "Everyday discoveries",
  description: "",
  revision: 1,
  createdAt: 0,
  updatedAt: 0,
};
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      notesController={
        new NotesController(repository, {
          list: async () => [thread],
          getMembers: async () => ({
            group: thread,
            members: [{ noteId: sampleNote().id, position: 0 }],
          }),
        })
      }
    />
  </StrictMode>,
);
