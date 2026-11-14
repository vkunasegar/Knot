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
      "Your note library will appear here when note creation and storage are available.",
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
    detail: "Favorited notes will appear here when note storage is available.",
  },
  {
    id: "archive",
    label: "Archive",
    description: "Set thoughts aside, keep their meaning.",
    detail:
      "Archived notes and their recovery actions will become available with note storage.",
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

export function parseDestination(hash: string): Destination {
  const candidate = hash.replace(/^#\/?/, "");
  return destinations.find(({ id }) => id === candidate)?.id ?? "home";
}
