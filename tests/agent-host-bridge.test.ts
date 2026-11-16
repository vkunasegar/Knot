import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentHostBridgeInstaller } from "../scripts/install-agent-host-bridge.mjs";

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

describe.skipIf(process.platform !== "linux")("Agent-host pnpm bridge", () => {
  let directory: string;
  let bin: string;
  let project: string;
  let original: string;
  let output: string;
  let flatpak: string;
  let spawnLog: string;
  let installer: AgentHostBridgeInstaller;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "knot-agent-bridge-"));
    bin = join(directory, "bin");
    project = join(directory, "Knot's project space");
    output = join(directory, "args");
    spawnLog = join(directory, "spawn-args");
    flatpak = join(directory, "flatpak-info");
    mkdirSync(bin);
    mkdirSync(project);
    original = join(directory, "original-pnpm");
    writeFileSync(
      original,
      `#!/bin/sh\nprintf '%s\\0' "$@" > ${quote(output)}\nexit 17\n`,
      { mode: 0o755 },
    );
    symlinkSync(original, join(bin, "pnpm"));
    // Emulate the host transport, never launching real host commands or changing
    // user configuration. The actual nested shell still executes the saved pnpm.
    writeFileSync(
      join(bin, "flatpak-spawn"),
      `#!/bin/sh\nprintf '%s\\0' "$@" > ${quote(spawnLog)}\nwhile [ "\${1#--}" != "$1" ]; do shift; done\nexec "$@"\n`,
      { mode: 0o755 },
    );
    installer = new AgentHostBridgeInstaller({
      projectRoot: project,
      binDirectory: bin,
      flatpakMarker: flatpak,
    });
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  function run(cwd: string, args = ["dev"]) {
    return spawnSync(join(bin, "pnpm"), args, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:/usr/bin:/bin` },
    });
  }
  const argumentsAt = (path: string) =>
    readFileSync(path, "utf8").split("\0").slice(0, -1);

  it("forwards Flatpak project commands, working directory, arguments and exit status without shell interpolation", () => {
    installer.install();
    writeFileSync(flatpak, "fixture");
    const nested = join(project, "nested folder");
    mkdirSync(nested);
    const args = [
      "dev",
      "--",
      "--locked",
      "a b",
      "it's literal",
      "$(touch unsafe)",
      "; exit 0",
    ];
    expect(run(nested, args).status).toBe(17);
    expect(argumentsAt(output)).toEqual(args);
    expect(argumentsAt(spawnLog).slice(0, 4)).toEqual([
      "--host",
      "--watch-bus",
      `--directory=${nested}`,
      "sh",
    ]);
    expect(existsSync(join(nested, "unsafe"))).toBe(false);
  });

  it("keeps native host and unrelated projects on the original pnpm", () => {
    installer.install();
    expect(run(project).status).toBe(17);
    expect(existsSync(spawnLog)).toBe(false);
    writeFileSync(flatpak, "fixture");
    const sibling = `${project}-other`;
    mkdirSync(sibling);
    expect(run(sibling).status).toBe(17);
    expect(existsSync(spawnLog)).toBe(false);
  });

  it("is repeatable and restores the exact original symlink", () => {
    installer.install();
    installer.install();
    expect(lstatSync(join(bin, "pnpm.knot-original")).isSymbolicLink()).toBe(
      true,
    );
    expect(readlinkSync(join(bin, "pnpm.knot-original"))).toBe(original);
    installer.uninstall();
    expect(readlinkSync(join(bin, "pnpm"))).toBe(original);
    expect(existsSync(join(bin, "pnpm.knot-original"))).toBe(false);
  });

  it("refuses an unrelated backup without modifying either entry", () => {
    const backup = join(bin, "pnpm.knot-original");
    writeFileSync(backup, "unrelated");
    expect(() => installer.install()).toThrow(/Backup already exists/);
    expect(readlinkSync(join(bin, "pnpm"))).toBe(original);
    expect(readFileSync(backup, "utf8")).toBe("unrelated");
  });

  it("reports a missing host transport without running inside the sandbox", () => {
    installer.install();
    writeFileSync(flatpak, "fixture");
    rmSync(join(bin, "flatpak-spawn"));
    const result = spawnSync(join(bin, "pnpm"), ["dev"], {
      cwd: project,
      encoding: "utf8",
      env: { PATH: bin },
    });
    expect(result.status).toBe(127);
    expect(result.stderr).toContain("flatpak-spawn is unavailable");
    expect(existsSync(output)).toBe(false);
  });

  it("returns host transport failures without falling back to sandbox execution", () => {
    installer.install();
    writeFileSync(flatpak, "fixture");
    writeFileSync(join(bin, "flatpak-spawn"), "#!/bin/sh\nexit 23\n", {
      mode: 0o755,
    });
    expect(run(project).status).toBe(23);
    expect(existsSync(output)).toBe(false);
  });
});
