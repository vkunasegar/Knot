import {
  accessSync,
  closeSync,
  constants,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const marker = "#!/bin/sh\n# KNOT pnpm agent bridge v1\n";
const defaultRoot = fileURLToPath(new URL("..", import.meta.url));
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

/** Owns a reversible user-local pnpm entry point, never the package binary.
 * Installation preserves symlinks and refuses an unrelated existing backup.
 * The platform marker can be injected by tests; the CLI uses /.flatpak-info.
 */
export class AgentHostBridgeInstaller {
  constructor({
    projectRoot = defaultRoot,
    binDirectory = join(homedir(), ".local", "bin"),
    flatpakMarker = "/.flatpak-info",
  } = {}) {
    this.projectRoot = realpathSync(projectRoot);
    this.destination = join(resolve(binDirectory), "pnpm");
    this.original = `${this.destination}.knot-original`;
    this.flatpakMarker = flatpakMarker;
  }

  isInstalled() {
    // pnpm can be a large standalone ELF. Read only the header when identifying
    // our wrapper; do not decode or rewrite an existing package executable.
    const descriptor = openSync(this.destination, "r");
    try {
      const header = Buffer.alloc(Buffer.byteLength(marker));
      readSync(descriptor, header, 0, header.length, 0);
      return header.toString("utf8") === marker;
    } finally {
      closeSync(descriptor);
    }
  }

  install() {
    accessSync(this.destination, constants.X_OK);
    const installed = this.isInstalled();
    if (installed) accessSync(this.original, constants.X_OK);
    else {
      try {
        lstatSync(this.original);
        throw new Error(
          `Backup already exists: ${this.original}. Nothing was changed.`,
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    const template = readFileSync(
      new URL("pnpm-agent-host.sh", import.meta.url),
      "utf8",
    );
    const values = {
      PROJECT_ROOT: this.projectRoot,
      ORIGINAL_PNPM: this.original,
      FLATPAK_MARKER: this.flatpakMarker,
    };
    const launcher = template.replace(
      /@KNOT_(PROJECT_ROOT|ORIGINAL_PNPM|FLATPAK_MARKER)@/g,
      (_, key) => shellQuote(values[key]),
    );
    const temporary = `${this.destination}.knot-${process.pid}-${crypto.randomUUID()}`;
    let backedUp = false;
    try {
      writeFileSync(temporary, launcher, { flag: "wx", mode: 0o755 });
      if (!installed) {
        renameSync(this.destination, this.original);
        backedUp = true;
      }
      renameSync(temporary, this.destination);
    } catch (error) {
      if (backedUp) renameSync(this.original, this.destination);
      throw error;
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
    return this.destination;
  }

  uninstall() {
    if (!this.isInstalled())
      throw new Error(
        "The pnpm entry point is not a KNOT bridge. Nothing was changed.",
      );
    accessSync(this.original, constants.X_OK);
    // Atomic replacement restores the exact original entry, including its symlink.
    renameSync(this.original, this.destination);
    return this.destination;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.platform !== "linux")
      throw new Error("The agent-host bridge is only needed on Linux/Flatpak.");
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== "--uninstall"))
      throw new Error(
        "Usage: node scripts/install-agent-host-bridge.mjs [--uninstall]",
      );
    const installer = new AgentHostBridgeInstaller();
    const uninstall = args.includes("--uninstall");
    console.log(
      `${uninstall ? "Restored original pnpm" : "Installed KNOT agent-host bridge"}: ${uninstall ? installer.uninstall() : installer.install()}`,
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Agent-host bridge installation failed.",
    );
    process.exitCode = 1;
  }
}
