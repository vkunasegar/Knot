import { getSchema, type JSONContent } from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import StarterKit from "@tiptap/starter-kit";
import type { JsonValue, NoteBody } from "../../../shared/domain";
import { SelectionHistory } from "./SelectionHistory";

/** Links are document data, never permission to launch a browser from the WebView. */
export function safeLink(value: string): boolean {
  if (
    /\s/u.test(value) ||
    [...value].some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return false;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Shared by validation and the live editor; changing this list changes our document contract. */
export function editorExtensions() {
  return [
    StarterKit.configure({
      undoRedo: false,
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        isAllowedUri: safeLink,
      },
    }),
    SelectionHistory,
    TaskList,
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { "data-type": "taskItem" },
      a11y: {
        checkboxLabel: (_node, checked) =>
          checked ? "Completed task" : "Incomplete task",
      },
    }),
  ];
}

const schema = getSchema(editorExtensions());

/**
 * ProseMirror drops unknown attributes when decoding JSON. Reject them before
 * decoding so opening an older/newer document can never silently erase data.
 * Envelope metadata stays opaque and is preserved by NotesController.
 */
export function editableDocument(body: NoteBody): JSONContent | null {
  const visit = (value: JsonValue, mark = false, depth = 0): boolean => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      depth > 80
    )
      return false;
    const node = value as Record<string, JsonValue>;
    if (typeof node.type !== "string") return false;
    const spec = mark ? schema.marks[node.type] : schema.nodes[node.type];
    if (!spec) return false;
    if (
      Object.keys(node).some(
        (key) =>
          ![
            "type",
            ...(mark
              ? ["attrs"]
              : node.type === "text"
                ? ["text", "marks"]
                : ["attrs", "content", "marks"]),
          ].includes(key),
      )
    )
      return false;
    if (node.attrs !== undefined) {
      if (
        !node.attrs ||
        typeof node.attrs !== "object" ||
        Array.isArray(node.attrs)
      )
        return false;
      const attrs = node.attrs as Record<string, JsonValue>;
      if (
        Object.keys(attrs).some(
          (key) => !Object.hasOwn(spec.spec.attrs ?? {}, key),
        )
      )
        return false;
      if (
        node.type === "heading" &&
        attrs.level !== undefined &&
        (typeof attrs.level !== "number" || ![1, 2, 3].includes(attrs.level))
      )
        return false;
      if (
        node.type === "taskItem" &&
        attrs.checked !== undefined &&
        typeof attrs.checked !== "boolean"
      )
        return false;
      if (
        node.type === "orderedList" &&
        attrs.start !== undefined &&
        (!Number.isSafeInteger(attrs.start) || Number(attrs.start) < 1)
      )
        return false;
      if (
        node.type === "codeBlock" &&
        attrs.language !== undefined &&
        attrs.language !== null &&
        typeof attrs.language !== "string"
      )
        return false;
      if (
        node.type === "link" &&
        (typeof attrs.href !== "string" || !safeLink(attrs.href))
      )
        return false;
      // Rendered link attributes must remain plain text; never coerce objects to HTML.
      if (
        node.type === "link" &&
        Object.values(attrs).some((v) => v !== null && typeof v !== "string")
      )
        return false;
    }
    if (node.type === "link" && !node.attrs) return false;
    if (node.type === "text" && typeof node.text !== "string") return false;
    if (
      node.content !== undefined &&
      (!Array.isArray(node.content) ||
        !node.content.every((child) => visit(child, false, depth + 1)))
    )
      return false;
    if (
      node.marks !== undefined &&
      (!Array.isArray(node.marks) ||
        !node.marks.every((child) => visit(child, true, depth + 1)))
    )
      return false;
    return true;
  };
  try {
    if (!visit(body.document)) return null;
    // v1 empty notes predate the editor and are valid empty paragraphs in its schema.
    const document =
      body.document.content === undefined ||
      (Array.isArray(body.document.content) &&
        body.document.content.length === 0)
        ? { type: "doc", content: [{ type: "paragraph" }] }
        : body.document;
    const node = schema.nodeFromJSON(document);
    node.check();
    return node.toJSON() as JSONContent;
  } catch {
    return null;
  }
}

/** JSON generated by this editor is rechecked before it becomes a storage draft. */
export function editorBody(
  document: JSONContent,
  previous: NoteBody,
): NoteBody {
  const body = { ...previous, document } as NoteBody;
  if (!editableDocument(body)) throw new Error("Unsupported editor document");
  return body;
}
