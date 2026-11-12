import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const checker = fileURLToPath(new URL("../scripts/check-linux.mjs", import.meta.url));
const project = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const pnpmVersion: string = project.packageManager.split("@")[1];
const rustVersion = readFileSync(new URL("../rust-toolchain.toml", import.meta.url), "utf8")
  .match(/^channel\s*=\s*"([^"]+)"/m)![1];

// Exercise the real CLI in a controlled Linux PATH; no Rust or GTK installation
// is needed for these failure-path tests. Fixtures never enter the product UI.
describe.skipIf(process.platform !== "linux")("Linux prerequisite CLI", () => {
  let fixturePath: string;

  function tool(name: string, body: string, shebang = true) {
    writeFileSync(join(fixturePath, name), `${shebang ? "#!/bin/sh\n" : ""}${body}\n`, { mode: 0o755 });
  }

  function check() {
    return spawnSync(process.execPath, [checker], {
      encoding: "utf8",
      env: { PATH: fixturePath },
      timeout: 10_000,
    });
  }

  beforeEach(() => {
    fixturePath = mkdtempSync(join(tmpdir(), "knot-linux-check-"));
    tool("pnpm", `printf '%s\\n' '${pnpmVersion}'`, false);
    tool("rustc", `printf '%s\\n' 'rustc ${rustVersion} (fixture)'`);
    tool("cargo", `printf '%s\\n' 'cargo ${rustVersion} (fixture)'`);
    tool("cc", "printf '%s\\n' 'C compiler fixture'");
    tool("pkg-config", "printf '%s\\n' '3.0.0'");
  });

  afterEach(() => rmSync(fixturePath, { recursive: true, force: true }));

  it("accepts pnpm's executable shell fallback without a shebang", () => {
    const direct = spawnSync(join(fixturePath, "pnpm"), ["--version"], { encoding: "utf8" });
    expect(direct.error).toMatchObject({ code: "ENOEXEC" });
    const result = check();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`OK pnpm: ${pnpmVersion}`);
    expect(result.stdout).toContain("Run pnpm dev to verify");
  });

  it("reports both missing WebKitGTK APIs and exits unsuccessfully", () => {
    tool("pkg-config", `case "$2" in
  webkit2gtk-4.1|javascriptcoregtk-4.1) exit 1 ;;
  *) printf '%s\\n' '3.0.0' ;;
esac`);
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("MISSING webkit2gtk-4.1:");
    expect(result.stdout).toContain("MISSING javascriptcoregtk-4.1:");
    expect(result.stderr).toContain("2 prerequisite check(s) failed");
    expect(result.stdout).not.toContain("Build prerequisites found");
  });

  it("rejects a pnpm version that differs from the project pin", () => {
    tool("pnpm", "printf '%s\\n' '0.0.0'", false);
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`MISSING pnpm: 0.0.0 (required ${pnpmVersion})`);
  });

  it("explains a missing pnpm command", () => {
    rmSync(join(fixturePath, "pnpm"));
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/MISSING pnpm:.*not found/);
  });

  it("aggregates a missing compiler and missing package discovery tool", () => {
    rmSync(join(fixturePath, "cc"));
    rmSync(join(fixturePath, "pkg-config"));
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("MISSING C compiler:");
    expect(result.stdout).toContain("MISSING pkg-config:");
    expect(result.stderr).toContain("2 prerequisite check(s) failed");
  });
});
