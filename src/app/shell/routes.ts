import type { NoteId } from "../../shared/domain";

export const destinations = [
  {
    id: "home",
    label: "Home",
    description: "A quiet place to pick up a thought.",
    detail:
      "Quick capture and recent notes will appear here when note storage is available.",
  },
  {
    id: "notes",
    label: "All Notes",
    description: "Room for every thought.",
    detail:
      "Create a note, keep a thought close, or recover it from the trash.",
  },
  {
    id: "threads",
    label: "Threads",
    description: "Follow a line of thought.",
    detail:
      "Ordered paths through your notes and the Weave will become available in a later milestone.",
  },
  {
    id: "collections",
    label: "Collections",
    description: "Give related ideas a place.",
    detail:
      "Collection creation and note membership will become available with collection storage.",
  },
  {
    id: "favorites",
    label: "Favorites",
    description: "Keep meaningful thoughts close.",
    detail: "Your favorite active notes, ready to pick up again.",
  },
  {
    id: "archive",
    label: "Archive",
    description: "Set thoughts aside, keep their meaning.",
    detail:
      "Archived notes stay here until you restore them to your active library.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Make space for your way of thinking.",
    detail:
      "Use the appearance controls to adjust your workspace. More settings will follow.",
  },
] as const;

export type Destination = (typeof destinations)[number]["id"];

export interface WorkspaceRoute {
  readonly destination: Destination;
  readonly noteId: NoteId | null;
  readonly trash: boolean;
}

/** Only canonical storage IDs enter document routes; arbitrary hashes never reach IPC. */
export function parseRoute(hash: string): WorkspaceRoute {
  const [area, detail, extra] = hash.replace(/^#\/?/, "").split("/");
  const destination = destinations.find(({ id }) => id === area)?.id;
  const home: WorkspaceRoute = {
    destination: "home",
    noteId: null,
    trash: false,
  };
  if (!destination || extra !== undefined) return home;
  if (!detail) return { destination, noteId: null, trash: false };
  if (destination === "notes" && detail === "trash")
    return { destination, noteId: null, trash: true };
  if (
    ["notes", "favorites", "archive"].includes(destination) &&
    /^(?!00000000-0000-0000-0000-000000000000$)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      detail,
    )
  )
    return { destination, noteId: detail as NoteId, trash: false };
  return home;
}

export function parseDestination(hash: string): Destination {
  return parseRoute(hash).destination;
}
