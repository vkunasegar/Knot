import { useEffect, useRef, useState, type RefObject } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { EditorState } from "@tiptap/pm/state";
import type { JSONContent } from "@tiptap/core";
import type { NoteBody } from "../../../shared/domain";
import { Button, Dialog } from "../../../shared/ui";
import { documentText } from "../model/noteValues";
import {
  editableDocument,
  editorExtensions,
  safeLink,
} from "../model/editorSchema";
import "./NoteEditor.css";

interface NoteEditorProps {
  body: NoteBody;
  readOnly: boolean;
  focusEditorRef: RefObject<(() => void) | null>;
  onChange: (document: JSONContent) => void;
  onSave: () => void;
}

function LinkDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string>(() =>
    String(editor.getAttributes("link").href ?? ""),
  );
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // ProseMirror retains the selection when focus enters the native modal.
  const [selection] = useState(() => ({
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  }));
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const close = () => {
    onClose();
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.commands.focus();
    });
  };
  return (
    <Dialog
      open
      title="Edit link"
      onClose={close}
      description="Use a full https://, http:// or mailto: address. Clear the address to remove the link."
    >
      <form
        className="editor-link-form"
        onSubmit={(event) => {
          event.preventDefault();
          const href = url.trim();
          if (href && !safeLink(href)) {
            setInvalid(true);
            return;
          }
          const chain = editor
            .chain()
            .setTextSelection(selection)
            .extendMarkRange("link");
          if (href) chain.setLink({ href }).run();
          else chain.unsetLink().run();
          close();
        }}
      >
        <label htmlFor="editor-link-url">Link address</label>
        <input
          ref={input}
          id="editor-link-url"
          type="text"
          value={url}
          aria-invalid={invalid}
          aria-describedby={invalid ? "editor-link-error" : undefined}
          onChange={(event) => {
            setUrl(event.target.value);
            setInvalid(false);
          }}
        />
        {invalid && (
          <p id="editor-link-error" role="alert">
            Enter a valid https://, http:// or mailto: address.
          </p>
        )}
        <Button type="submit" variant="primary">
          Apply link
        </Button>
      </form>
    </Dialog>
  );
}

function FormatBar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      heading: current.isActive("heading", { level: 2 }),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      task: current.isActive("taskList"),
      code: current.isActive("codeBlock"),
      link: current.isActive("link"),
      undo: current.can().undo(),
      redo: current.can().redo(),
    }),
  });
  const actions = [
    {
      name: "Bold",
      label: "B",
      active: state.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      name: "Italic",
      label: "I",
      active: state.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      name: "H2 heading",
      label: "H2",
      active: state.heading,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      name: "Bullet list",
      label: "•",
      active: state.bullet,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      name: "1. Numbered list",
      label: "1.",
      active: state.ordered,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      name: "Checklist",
      label: "☑",
      active: state.task,
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      name: "Code block",
      label: "</>",
      active: state.code,
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      name: "Edit link",
      label: "Link",
      active: state.link,
      run: () => setLinkOpen(true),
    },
  ];
  return (
    <>
      {/* A group uses ordinary Tab navigation; no undocumented toolbar arrow-key model. */}
      <div
        role="group"
        aria-label="Text formatting"
        className="editor-format-bar"
      >
        {actions.map((action) => (
          <Button
            key={action.name}
            variant="quiet"
            size="sm"
            aria-label={action.name}
            aria-pressed={action.active}
            title={action.name}
            onMouseDown={(event) => event.preventDefault()}
            onClick={action.run}
          >
            <span aria-hidden="true">{action.label}</span>
          </Button>
        ))}
        <span className="editor-format-bar__divider" aria-hidden="true" />
        <Button
          variant="quiet"
          size="sm"
          aria-label="Undo text change"
          disabled={!state.undo}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </Button>
        <Button
          variant="quiet"
          size="sm"
          aria-label="Redo text change"
          disabled={!state.redo}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </Button>
      </div>
      {linkOpen && (
        <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} />
      )}
    </>
  );
}

function LiveEditor({
  body,
  readOnly,
  focusEditorRef,
  onChange,
  onSave,
  initial,
}: NoteEditorProps & { initial: JSONContent }) {
  const editor = useEditor({
    extensions: editorExtensions(),
    content: initial,
    editable: !readOnly,
    enableContentCheck: true,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Note body",
        "aria-multiline": "true",
        "aria-describedby": "editor-help",
        class: "note-editor__body",
      },
      // Stored links remain editable text. External navigation needs a native opener contract.
      handleClick: (_view, _pos, event) =>
        !!(event.target instanceof Element && event.target.closest("a")),
      handleKeyDown: (_view, event) => {
        if (
          !readOnly &&
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          event.stopPropagation();
          onSave();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });
  const empty = useEditorState({
    editor,
    selector: ({ editor: current }) => current.isEmpty,
  });

  useEffect(() => {
    if (!editor) return;
    // A permission change is not a document edit and must not create a draft.
    editor.setEditable(!readOnly, false);
    editor.view.dom.setAttribute("aria-readonly", String(readOnly));
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    // A save acknowledgement or status update must never replace the live editor:
    // doing so destroys selection/history. Only a different authoritative document
    // (discard/reload) starts fresh history, so Undo cannot resurrect discarded text.
    const next = editableDocument(body);
    if (next) {
      const doc = editor.schema.nodeFromJSON(next);
      if (!editor.state.doc.eq(doc))
        editor.view.updateState(
          EditorState.create({
            schema: editor.schema,
            doc,
            plugins: editor.state.plugins,
          }),
        );
    }
  }, [body, editor]);

  useEffect(() => {
    if (!editor) return;
    focusEditorRef.current = () =>
      editor.commands.focus(undefined, { scrollIntoView: false });
    return () => {
      focusEditorRef.current = null;
    };
  }, [editor, focusEditorRef]);

  return (
    <section className="notes-document note-editor" aria-label="Note content">
      {editor && !readOnly && <FormatBar editor={editor} />}
      <p id="editor-help" className="note-editor__help">
        {readOnly
          ? "Read-only · Restore this note to edit."
          : "Write freely. Use #, - or [ ] followed by a space, or select text to format. Ctrl/Cmd+S saves the body."}
      </p>
      <EditorContent editor={editor} />
      {empty && !readOnly && (
        <p className="note-editor__placeholder" aria-hidden="true">
          Every thought begins with a thread…
        </p>
      )}
    </section>
  );
}

/** Each mounted note owns one editor; panel/Focus Mode changes keep this instance alive. */
export function NoteEditor(props: NoteEditorProps) {
  const document = editableDocument(props.body);
  if (!document)
    return (
      <section
        className="notes-document"
        aria-label="Note content"
        ref={(node) => {
          props.focusEditorRef.current = node
            ? () => node.focus({ preventScroll: true })
            : null;
        }}
        tabIndex={-1}
      >
        <p role="status">
          This document contains formatting this version cannot edit safely. The
          original is preserved.
        </p>
        <p className="notes-document__body">
          {documentText(props.body) || "No text preview available."}
        </p>
      </section>
    );
  return <LiveEditor {...props} initial={document} />;
}
