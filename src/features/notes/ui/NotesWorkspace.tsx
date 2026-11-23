import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { Note, NoteId } from "../../../shared/domain";
import { Button, NoteChip } from "../../../shared/ui";
import { NotesController, type NotesSnapshot } from "../model/NotesController";
import {
  documentText,
  noteTitle,
  visibleNotes,
  type NoteSort,
  type NoteView,
} from "../model/noteValues";
import "./NotesWorkspace.css";
import { NoteEditor } from "./NoteEditor";

interface NotesWorkspaceProps {
  controller: NotesController;
  view: NoteView;
  noteId: NoteId | null;
  sort: NoteSort;
  onSort: (sort: NoteSort) => void;
  onOpen: (id: NoteId) => void;
  onList: (view: NoteView) => void;
  onCreate: () => void;
  onDuplicate: (id: NoteId) => void;
  /** App owns the shell focus bridge; the workflow owns the actual focus target. */
  focusEditorRef: RefObject<(() => void) | null>;
}

const date = (value: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
const labels: Record<NoteView, string> = {
  notes: "All Notes",
  favorites: "Favorites",
  archive: "Archive",
  trash: "Trash",
};
const emptyMessages: Record<NoteView, string> = {
  notes: "A little room for your next thought.",
  favorites: "Keep a meaningful thought close.",
  archive: "Nothing set aside yet.",
  trash: "Your trash is empty.",
};

function NoteDetails({
  note,
  state,
  controller,
  focusEditorRef,
  disabled,
  onDuplicate,
  onList,
  view,
}: {
  note: Note;
  state: NotesSnapshot;
  controller: NotesController;
  focusEditorRef: RefObject<(() => void) | null>;
  disabled: boolean;
  onDuplicate: (id: NoteId) => void;
  onList: (view: NoteView) => void;
  view: NoteView;
}) {
  const input = useRef<HTMLInputElement>(null);
  const trashed = note.deletedAt !== null;
  const draft = state.drafts[note.id] ?? note.title;
  const dirty = draft !== note.title;
  const bodyDraft = state.bodyDrafts[note.id];
  const body = bodyDraft?.body ?? note.body;
  const conflict = controller.hasBodyConflict(note.id);
  const [bodyGeneration, resetBody] = useState(0);
  useEffect(() => {
    void controller.loadThreads(note.id);
  }, [controller, note.id]);
  useEffect(() => {
    // Route focus runs in the shell first; focus the actual document afterwards.
    const frame = requestAnimationFrame(() => {
      if (trashed) focusEditorRef.current?.();
      else input.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [note.id, trashed, focusEditorRef]);

  return (
    <>
      <div className="notes-toolbar notes-toolbar--actions">
        <Button
          variant="quiet"
          onClick={() => onList(trashed ? "trash" : view)}
        >
          <span aria-hidden="true">←</span> Back to{" "}
          {labels[trashed ? "trash" : view]}
        </Button>
        {trashed ? (
          <Button
            disabled={disabled}
            onClick={() => void controller.restore(note.id)}
          >
            Restore note
          </Button>
        ) : (
          <>
            <Button
              disabled={disabled}
              aria-pressed={note.isFavorite}
              onClick={() => void controller.favorite(note.id)}
            >
              {note.isFavorite ? "Remove favorite" : "Add favorite"}
            </Button>
            <Button disabled={disabled} onClick={() => onDuplicate(note.id)}>
              Duplicate
            </Button>
            <Button
              disabled={disabled}
              onClick={() => void controller.archive(note.id)}
            >
              {note.archivedAt === null
                ? "Archive note"
                : "Restore from archive"}
            </Button>
            <Button
              disabled={disabled}
              onClick={() => void controller.trash(note.id)}
            >
              Move to trash
            </Button>
          </>
        )}
      </div>
      {trashed && (
        <p className="notes-notice">
          This note is in the trash. Restore it to make changes.
          {note.archivedAt !== null ? " It will return to Archive." : ""}
        </p>
      )}
      {note.archivedAt !== null && !trashed && (
        <p className="notes-notice">
          This note is archived and hidden from active lists.
        </p>
      )}
      <div className="notes-writing-column">
        <div className="notes-thread-context" aria-label="Thread membership">
          {state.contextErrors[note.id] ? (
            <p role="status">{state.contextErrors[note.id]}</p>
          ) : state.threads[note.id]?.length ? (
            state.threads[note.id].map((thread) => (
              <NoteChip
                key={thread.id}
                title={thread.name}
                meta={`Thread · ${thread.position} of ${thread.total}`}
              />
            ))
          ) : (
            <span>No thread yet</span>
          )}
        </div>
        <form
          className="notes-title-form"
          onSubmit={(event) => {
            event.preventDefault();
            void controller.rename(note.id).then(() => {
              // Disabling a submitting control can send focus to the document.
              // Restore the field only if the user has not chosen another target.
              if (document.activeElement === document.body)
                input.current?.focus();
            });
          }}
        >
          <label htmlFor="note-title">Title</label>
          <input
            ref={input}
            id="note-title"
            value={draft}
            readOnly={trashed}
            disabled={state.pending}
            aria-describedby="note-title-help"
            onChange={(event) => controller.draft(note.id, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && dirty) {
                event.preventDefault();
                event.stopPropagation();
                controller.cancelDraft(note.id);
              }
            }}
          />
          <p id="note-title-help">
            An empty title appears as Untitled. Up to 4096 UTF-8 bytes.
          </p>
          {!trashed && dirty && (
            <div className="notes-toolbar">
              <Button
                type="submit"
                variant="primary"
                disabled={disabled || !dirty}
              >
                Save title
              </Button>
              <Button
                disabled={state.pending || state.drafts[note.id] === undefined}
                onClick={() => controller.cancelDraft(note.id)}
              >
                Cancel title changes
              </Button>
            </div>
          )}
        </form>
        <details className="notes-metadata">
          <summary>Note details</summary>
          <dl className="notes-dates">
            <div>
              <dt>Created</dt>
              <dd>
                <time dateTime={new Date(note.createdAt).toISOString()}>
                  {date(note.createdAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                <time dateTime={new Date(note.updatedAt).toISOString()}>
                  {date(note.updatedAt)}
                </time>
              </dd>
            </div>
          </dl>
        </details>
        {conflict && (
          <div className="notes-notice" role="alert">
            <p>
              The stored body changed elsewhere. Your local text remains below;
              copy it before discarding to compare both versions.
            </p>
            <details>
              <summary>Stored body preview</summary>
              <p className="notes-document__body">
                {documentText(note.body) || "Empty body"}
              </p>
            </details>
          </div>
        )}
        <NoteEditor
          key={`${note.id}:${bodyGeneration}`}
          body={body}
          readOnly={trashed}
          focusEditorRef={focusEditorRef}
          onChange={(document) => controller.draftBody(note.id, document)}
          onSave={() => {
            void controller.saveBody(note.id);
          }}
        />
        {!trashed && (
          <div className="notes-toolbar notes-body-actions">
            <Button
              variant="primary"
              disabled={disabled || !bodyDraft || conflict}
              onClick={() => void controller.saveBody(note.id)}
            >
              Save body
            </Button>
            <Button
              disabled={state.pending || !bodyDraft}
              onClick={() => {
                controller.cancelBodyDraft(note.id);
                resetBody((value) => value + 1);
              }}
            >
              Discard body changes
            </Button>
            <span>
              {bodyDraft
                ? "Body changes are not saved yet."
                : "Body uses explicit saving."}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

export function NotesWorkspace({
  controller,
  view,
  noteId,
  sort,
  onSort,
  onOpen,
  onList,
  onCreate,
  onDuplicate,
  focusEditorRef,
}: NotesWorkspaceProps) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const note = state.notes.find((item) => item.id === noteId);
  const notes = visibleNotes(state.notes, view, sort);
  const disabled = state.pending || state.uncertain || state.phase !== "ready";
  return (
    <div
      className="notes-workspace"
      aria-busy={state.phase === "loading" || state.pending}
    >
      {state.error && (
        <div className="notes-feedback">
          <p role="alert">{state.error}</p>
          <Button
            disabled={state.pending || state.phase === "loading"}
            onClick={() => void controller.load()}
          >
            Reload library
          </Button>
          <Button variant="quiet" onClick={controller.dismissError}>
            Dismiss message
          </Button>
        </div>
      )}
      {state.undo && (
        <div className="notes-feedback">
          <p role="status">{state.undo.message}</p>
          <Button disabled={disabled} onClick={() => void controller.undo()}>
            Undo
          </Button>
          <Button variant="quiet" onClick={controller.dismissUndo}>
            Dismiss undo
          </Button>
        </div>
      )}
      {state.phase === "loading" && <p role="status">Loading notes…</p>}
      {state.loadError && (
        <div className="notes-feedback">
          <p role="alert">{state.loadError}</p>
          <Button
            disabled={state.pending}
            onClick={() => void controller.load()}
          >
            Try loading again
          </Button>
        </div>
      )}
      {noteId ? (
        note ? (
          <NoteDetails
            key={note.id}
            note={note}
            state={state}
            controller={controller}
            focusEditorRef={focusEditorRef}
            disabled={disabled}
            onDuplicate={onDuplicate}
            onList={onList}
            view={view}
          />
        ) : (
          state.phase === "ready" && (
            <section className="notes-empty">
              <h2>Note unavailable</h2>
              <p>It may have been removed or the link may be outdated.</p>
              <Button onClick={() => onList(view)}>
                Back to {labels[view]}
              </Button>
            </section>
          )
        )
      ) : (
        <>
          <div className="notes-toolbar notes-toolbar--list">
            <p>
              {view === "trash"
                ? "Recover a thought whenever you need it."
                : "Every thought has a place."}
            </p>
            {view === "notes" && (
              <Button variant="quiet" onClick={() => onList("trash")}>
                Open trash
              </Button>
            )}
            {view === "trash" && (
              <Button variant="quiet" onClick={() => onList("notes")}>
                Back to All Notes
              </Button>
            )}
            <label>
              Sort notes{" "}
              <select
                value={sort}
                onChange={(event) => onSort(event.target.value as NoteSort)}
              >
                <option value="updated">Last updated</option>
                <option value="created">Date created</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
            <Button
              variant="quiet"
              disabled={state.pending || state.phase === "loading"}
              onClick={() => void controller.load()}
            >
              Refresh notes
            </Button>
          </div>
          {state.phase === "ready" && notes.length === 0 && (
            <section className="notes-empty">
              <p className="shell-eyebrow">{labels[view]}</p>
              <h2>{emptyMessages[view]}</h2>
              <p>
                {view === "trash"
                  ? "Notes moved here stay recoverable, including after restarting KNOT."
                  : "Create a note or return to All Notes to pick up a thought."}
              </p>
              <Button variant="primary" disabled={disabled} onClick={onCreate}>
                Create a note
              </Button>
            </section>
          )}
          <ul className="notes-list" aria-label={`${labels[view]} list`}>
            {notes.map((item) => (
              <li key={item.id}>
                <a
                  href={`#/${view === "trash" ? "notes" : view}/${item.id}`}
                  className="notes-card"
                  onClick={(event) => {
                    if (
                      event.button === 0 &&
                      !event.ctrlKey &&
                      !event.metaKey &&
                      !event.shiftKey &&
                      !event.altKey
                    ) {
                      event.preventDefault();
                      onOpen(item.id);
                    }
                  }}
                >
                  <div className="notes-card__title">
                    <h2>{noteTitle(item)}</h2>
                    {item.isFavorite && <span aria-label="Favorite">★</span>}
                  </div>
                  <p className="notes-card__preview">
                    {documentText(item.body).slice(0, 180) ||
                      "No text content yet."}
                  </p>
                  <p className="notes-card__dates">
                    Created {date(item.createdAt)} · Updated{" "}
                    {date(item.updatedAt)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
