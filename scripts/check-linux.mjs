import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

if (process.platform !== "linux") {
  console.error("This check targets Linux. See docs/development/PORTABILITY.md for other platforms.");
  process.exit(1);
}

const project = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const nodeMajor = readFileSync(new URL("../.node-version", import.meta.url), "utf8").trim();
const rustVersion = readFileSync(new URL("../rust-toolchain.toml", import.meta.url), "utf8")
  .match(/^channel\s*=\s*"([^"]+)"/m)[1];
const pnpmVersion = project.packageManager.split("@")[1];
let failures = 0;

function report(ok, name, detail) {
  console.log(`${ok ? "OK" : "MISSING"} ${name}: ${detail}`);
  if (!ok) failures += 1;
}

function run(command, args) {
  return spawnSync(command, args, { encoding: "utf8", timeout: 30_000 });
}

report(process.versions.node.split(".")[0] === nodeMajor, "Node.js", `${process.version} (required ${nodeMajor}.x)`);

for (const [command, required] of [["pnpm", pnpmVersion], ["rustc", rustVersion], ["cargo", rustVersion]]) {
  // pnpm can install a POSIX shell fallback without a shebang when npm blocks
  // its install scripts. Let the shell handle it, just as the terminal does.
  const result = command === "pnpm"
    ? run("/bin/sh", ["-c", "pnpm --version"])
    : run(command, ["--version"]);
  const output = result.stdout?.trim().split("\n")[0];
  const version = output?.match(/\d+\.\d+\.\d+/)?.[0];
  report(result.status === 0 && version === required, command,
    `${output || result.error?.message || result.stderr?.trim().split("\n")[0] || "not available on PATH"} (required ${required})`);
}

const compiler = run("cc", ["--version"]);
report(compiler.status === 0, "C compiler", compiler.stdout?.trim().split("\n")[0] || "cc not available on PATH");

const pkgConfig = run("pkg-config", ["--version"]);
report(pkgConfig.status === 0, "pkg-config", pkgConfig.stdout?.trim() || "not available on PATH");
if (pkgConfig.status === 0) {
  for (const library of ["gtk+-3.0", "webkit2gtk-4.1", "javascriptcoregtk-4.1", "libsoup-3.0", "openssl"]) {
    const result = run("pkg-config", ["--modversion", library]);
    report(result.status === 0, library, result.stdout?.trim() || "development files not found by pkg-config");
  }
}

if (existsSync("/.flatpak-info")) {
  console.log("NOTE Flatpak: this checks the sandbox, not the host. Run the check in Konsole on CachyOS.");
}

if (!process.env.WAYLAND_DISPLAY && !process.env.DISPLAY) {
  console.log("NOTE No display variable found. Start the app from your logged-in desktop session.");
}

if (failures > 0) {
  console.error(`\n${failures} prerequisite check(s) failed. Follow docs/development/CACHYOS.md, then rerun pnpm check:linux.`);
  process.exitCode = 1;
} else {
  console.log("\nBuild prerequisites found. Run pnpm dev to verify the native KNOT window; this check does not open or verify a window.");
}
