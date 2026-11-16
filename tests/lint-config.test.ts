import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Exercise the actual repository configuration without creating invalid files
// that would themselves break the normal lint/typecheck commands.
const eslint = new ESLint();

async function lint(source: string, filePath: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.map(({ ruleId }) => ruleId);
}

describe("quality configuration", () => {
  it("accepts typed browser components and Node tooling", async () => {
    expect(
      await lint(
        `export function Title() {
      return <h1>{window.document.title}</h1>;
    }`,
        "src/lint-probe.tsx",
      ),
    ).toEqual([]);
    expect(
      await lint(
        `import { readFileSync } from "node:fs";
      console.log(readFileSync(process.argv[2], "utf8"));`,
        "scripts/lint-probe.mjs",
      ),
    ).toEqual([]);
  });

  it("rejects JavaScript mistakes and unscoped browser globals in Node tooling", async () => {
    expect(
      await lint(
        "const unused = 1; missing(); window.alert();",
        "scripts/lint-probe.mjs",
      ),
    ).toEqual(expect.arrayContaining(["no-unused-vars", "no-undef"]));
  });

  it("rejects conditional hooks and missing effect dependencies", async () => {
    const messages = await lint(
      `import { useEffect } from "react";
      export function Title({ visible, title }: { visible: boolean; title: string }) {
        if (visible) useEffect(() => { document.title = title; }, []);
        return <h1>{title}</h1>;
      }`,
      "src/lint-probe.tsx",
    );
    expect(messages).toEqual(
      expect.arrayContaining([
        "react-hooks/rules-of-hooks",
        "react-hooks/exhaustive-deps",
      ]),
    );
  });

  it("rejects inaccessible JSX", async () => {
    expect(
      await lint(
        `export function Image() { return <img src="knot.png" />; }`,
        "src/lint-probe.tsx",
      ),
    ).toContain("jsx-a11y/alt-text");
  });

  it("ignores generated output", async () => {
    expect(await eslint.isPathIgnored("dist/assets/app.js")).toBe(true);
    expect(await eslint.isPathIgnored("src-tauri/target/debug/output.js")).toBe(
      true,
    );
  });
});
