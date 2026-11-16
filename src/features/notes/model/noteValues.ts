import type { JsonValue, Note, NoteBody } from "../../../shared/domain";

export type NoteView = "notes" | "favorites" | "archive" | "trash";
export type NoteSort = "updated" | "created" | "title";

export const emptyBody: NoteBody = {
  version: 1,
  document: { type: "doc", content: [] },
};
export const noteTitle = (note: Pick<Note, "title">) =>
  note.title.trim() || "Untitled";

/** Read text nodes only. Stored HTML, attributes and unknown nodes are never executed. */
export function documentText(body: NoteBody): string {
  const visit = (value: JsonValue): string => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    const node = value as { readonly [key: string]: JsonValue };
    if (node.type === "text" && typeof node.text === "string") return node.text;
    if (node.type === "hardBreak") return "\n";
    const content = Array.isArray(node.content)
      ? node.content.map(visit).join("")
      : "";
    return content &&
      [
        "paragraph",
        "heading",
        "listItem",
        "taskItem",
        "codeBlock",
        "blockquote",
      ].includes(String(node.type))
      ? `${content}\n`
      : content;
  };
  return visit(body.document).trim();
}

export function visibleNotes(
  notes: readonly Note[],
  view: NoteView,
  sort: NoteSort,
): readonly Note[] {
  return notes
    .filter((note) => {
      if (view === "trash") return note.deletedAt !== null;
      if (note.deletedAt !== null) return false;
      if (view === "archive") return note.archivedAt !== null;
      return (
        note.archivedAt === null && (view !== "favorites" || note.isFavorite)
      );
    })
    .sort((a, b) => {
      const order =
        sort === "title"
          ? noteTitle(a).localeCompare(noteTitle(b))
          : sort === "created"
            ? b.createdAt - a.createdAt
            : b.updatedAt - a.updatedAt;
      return order || a.id.localeCompare(b.id);
    });
}

/** Only the new copy's display title is shortened; source title/body stay untouched. */
export function copyTitle(title: string): string {
  const suffix = " (copy)";
  const encoder = new TextEncoder();
  let result = "";
  let bytes = encoder.encode(suffix).length;
  for (const character of title || "Untitled") {
    const size = encoder.encode(character).length;
    if (bytes + size > 4096) break;
    result += character;
    bytes += size;
  }
  return result + suffix;
}
