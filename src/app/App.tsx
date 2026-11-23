import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BrowserShellPreferencesStorage,
  createDomainRepositories,
} from "../data";
import {
  NotesController,
  NotesWorkspace,
  noteTitle,
  type NoteSort,
  type NoteView,
} from "../features/notes";
import type { NoteId } from "../shared/domain";
import {
  DesktopShell,
  NavigationController,
  ShellPreferencesService,
} from "./shell";
import "./App.css";

export interface AppProps {
  /** Composition seam for isolated UI tests; production always uses native storage. */
  notesController?: NotesController;
}

export function App({ notesController }: AppProps = {}) {
  // Application composition owns concrete adapters. Constructors subscribe to
  // nothing, keeping Strict Mode initialization free of lifecycle side effects.
  const [navigation] = useState(() => new NavigationController(window));
  const [preferences] = useState(
    () => new ShellPreferencesService(new BrowserShellPreferencesStorage()),
  );
  const [notes] = useState(() => {
    if (notesController) return notesController;
    const repositories = createDomainRepositories();
    return new NotesController(repositories.notes, repositories.threads);
  });
  const state = useSyncExternalStore(notes.subscribe, notes.getSnapshot);
  const route = useSyncExternalStore(
    navigation.subscribe,
    navigation.getSnapshot,
  );
  const focusEditor = useRef<(() => void) | null>(null);
  const creating = useRef(false);
  const [sort, setSort] = useState<NoteSort>("updated");
  const isNotesArea = ["notes", "favorites", "archive"].includes(
    route.destination,
  );
  const view: NoteView = route.trash
    ? "trash"
    : isNotesArea
      ? (route.destination as NoteView)
      : "notes";
  const selected = isNotesArea
    ? state.notes.find((note) => note.id === route.noteId)
    : undefined;

  useEffect(() => {
    if (isNotesArea && state.phase === "idle") void notes.load();
  }, [isNotesArea, state.phase, notes]);

  const createNote = async () => {
    if (creating.current) return;
    creating.current = true;
    // Expose loading/create errors in the library even when invoked from Home.
    navigation.navigate("notes");
    const origin = navigation.getSnapshot();
    try {
      if (notes.getSnapshot().phase === "idle") await notes.load();
      const note = await notes.create();
      // A slow commit must not pull the user back after they chose another view.
      if (note && navigation.getSnapshot() === origin)
        navigation.navigate("notes", { noteId: note.id });
    } finally {
      creating.current = false;
    }
  };
  const duplicateNote = async (id: NoteId) => {
    const origin = navigation.getSnapshot();
    const note = await notes.duplicate(id);
    if (note && navigation.getSnapshot() === origin)
      navigation.navigate("notes", { noteId: note.id });
  };
  const dirty =
    selected &&
    ((state.drafts[selected.id] !== undefined &&
      state.drafts[selected.id] !== selected.title) ||
      !!state.bodyDrafts[selected.id]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (
        Object.keys(state.drafts).length ||
        Object.keys(state.bodyDrafts).length ||
        state.pending
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [state.drafts, state.bodyDrafts, state.pending]);
  return (
    <DesktopShell
      navigation={navigation}
      preferences={preferences}
      heading={route.trash ? "Trash" : undefined}
      onCreateNote={() => void createNote()}
      creatingNote={
        state.pending || state.phase === "loading" || state.uncertain
      }
      document={
        selected
          ? {
              title: noteTitle(selected),
              editorOwnsTitle: true,
              saveStatus: {
                state:
                  state.writes[selected.id] === "saving"
                    ? "saving"
                    : state.writes[selected.id] === "error"
                      ? "error"
                      : dirty
                        ? "unsaved"
                        : (state.writes[selected.id] ?? "idle"),
              },
              focusEditor: () => focusEditor.current?.(),
            }
          : undefined
      }
    >
      {isNotesArea ? (
        <NotesWorkspace
          controller={notes}
          view={view}
          noteId={route.noteId}
          sort={sort}
          onSort={setSort}
          onCreate={() => void createNote()}
          onDuplicate={(id) => void duplicateNote(id)}
          focusEditorRef={focusEditor}
          onOpen={(noteId) =>
            navigation.navigate(route.destination, { noteId })
          }
          onList={(next) =>
            navigation.navigate(next === "trash" ? "notes" : next, {
              trash: next === "trash",
            })
          }
        />
      ) : undefined}
    </DesktopShell>
  );
}
