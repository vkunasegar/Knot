import type { NoteBody } from "../../src/shared/domain";

/** Deliberately mixed content shared by editor round-trip and browser acceptance tests. */
export const richBody: NoteBody = {
  version: 1,
  futureMetadata: { keep: true },
  document: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Threads worth following" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "A quiet place for " },
          {
            type: "text",
            text: "important thoughts",
            marks: [{ type: "bold" }],
          },
          { type: "text", text: " and " },
          {
            type: "text",
            text: "small discoveries",
            marks: [{ type: "italic" }],
          },
          { type: "text", text: ". " },
          {
            type: "text",
            text: "Read the source",
            marks: [
              { type: "link", attrs: { href: "https://example.com/ideas" } },
            ],
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Notice a connection" }],
              },
            ],
          },
        ],
      },
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Follow the thought" }],
              },
            ],
          },
        ],
      },
      {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Return to this idea" }],
              },
            ],
          },
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Keep the original context" }],
              },
            ],
          },
        ],
      },
      {
        type: "codeBlock",
        attrs: { language: "typescript" },
        content: [
          {
            type: "text",
            text: 'const thought = "Every thought is a thread.";',
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "There is room for another thought. 🧶" },
        ],
      },
    ],
  },
};
