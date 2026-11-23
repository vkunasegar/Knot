import { describe, expect, it } from "vitest";
import { richBody } from "../../../../tests/fixtures/richText";
import type { NoteBody, JsonValue } from "../../../shared/domain";
import { editableDocument, editorBody, safeLink } from "./editorSchema";
import { emptyBody } from "./noteValues";

describe("editor document boundary", () => {
  it("accepts empty v1 and mixed OSS formatting without losing envelope metadata", () => {
    expect(editableDocument(emptyBody)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    const document = editableDocument(richBody)!;
    expect(document).not.toBeNull();
    expect(editableDocument(editorBody(document, richBody))).toEqual(document);
    expect(editorBody(document, richBody).futureMetadata).toEqual({
      keep: true,
    });
    expect(
      document.content?.find((node) => node.type === "orderedList")?.attrs
        ?.start,
    ).toBe(3);
    expect(
      document.content?.find((node) => node.type === "taskList")?.content?.[1]
        ?.attrs?.checked,
    ).toBe(true);
  });

  it.each<JsonValue>([
    {
      type: "text",
      text: "keep",
      content: [{ type: "text", text: "must not be dropped" }],
    },
    { type: "paragraph", text: "must not be dropped" },
    {
      type: "paragraph",
      content: [{ type: "text", text: "broken", marks: [{ type: "link" }] }],
    },
    { type: "futureNode", content: [{ type: "text", text: "keep" }] },
    { type: "paragraph", attrs: { futureAttribute: "keep" } },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "keep", marks: [{ type: "futureMark" }] },
      ],
    },
    { type: "paragraph", content: [{ type: "heading", attrs: { level: 2 } }] },
    { type: "heading", attrs: { level: 8 } },
    { type: "heading", attrs: { level: "2" } },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: "false" },
          content: [{ type: "paragraph" }],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "unsafe",
          marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "unsafe",
          marks: [
            {
              type: "link",
              attrs: { href: "https://example.com", target: {} },
            },
          ],
        },
      ],
    },
  ])(
    "protects unsupported or invalid data instead of silently rewriting it: %j",
    (node) => {
      const body: NoteBody = {
        version: 1,
        document: { type: "doc", content: [node] },
      };
      const original = JSON.stringify(body);
      expect(editableDocument(body)).toBeNull();
      expect(JSON.stringify(body)).toBe(original);
    },
  );

  it("treats literal HTML as text and rejects active, relative and obfuscated link protocols", () => {
    const document = {
      type: "doc" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ],
    };
    expect(editableDocument({ version: 1, document })).toEqual(document);
    for (const href of [
      "javascript:alert(1)",
      "java\nscript:alert(1)",
      "data:text/html,x",
      "file:///tmp/x",
      "//example.com",
      "/relative",
      "https://exa\0mple.com",
      "https://example.com/has space",
    ])
      expect(safeLink(href)).toBe(false);
    for (const href of [
      "https://example.com/path?q=a%20b",
      "http://localhost:1234/",
      "mailto:hello@example.com",
    ])
      expect(safeLink(href)).toBe(true);
  });
});
