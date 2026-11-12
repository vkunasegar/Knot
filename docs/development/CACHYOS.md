# Development, build and run on CachyOS

These instructions target CachyOS / Arch Linux with KDE Plasma on x86_64.
Run commands in a host terminal such as Konsole, from the repository root
unless stated otherwise. A Flatpak terminal can have a different PATH and
different system libraries from the host.

## Install the prerequisites

| Tool | Project requirement | Source of truth |
| --- | --- | --- |
| Node.js | 24.x | [`.node-version`](../../.node-version), [`package.json`](../../package.json) |
| pnpm | 12.18.0 | `packageManager` in `package.json` |
| Rust | 1.100.0, with rustfmt | [`rust-toolchain.toml`](../../rust-toolchain.toml) |
| Linux WebView | WebKitGTK API 4.1 with GTK 3 | [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#linux) |

Install the native dependencies:

```sh
sudo pacman -Syu
sudo pacman -S --needed base-devel pkgconf webkit2gtk-4.1 curl wget file \
  openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
```

Arch packages include development files; Debian package names ending in `-dev`
do not apply here. WebKitGTK 4.0 and WebKitGTK 6.0 do not replace the required
4.1 API. The package list follows the [Tauri Arch setup](https://v2.tauri.app/start/prerequisites/#linux).

If Node 24 and rustup are not already managed by your existing tool setup,
install them using the Arch packages:

```sh
sudo pacman -S --needed nodejs-lts-krypton npm rustup
```

[`nodejs-lts-krypton`](https://archlinux.org/packages/extra/x86_64/nodejs-lts-krypton/)
supplies Node 24. Keep one installation method for each tool; an existing
Node version manager or rustup installation can also supply the required
versions. The distro `rust` package and rustup are alternative ways of managing
Rust; this project uses rustup to select its pinned toolchain.

Install pnpm in your user directory, then prepare the Rust toolchain:

```sh
npm install --global --prefix "$HOME/.local" pnpm@12.18.0
export PATH="$HOME/.local/bin:$PATH"
rustup toolchain install 1.100.0 --profile minimal --component rustfmt
```

Keep `$HOME/.local/bin` on your shell's PATH for future sessions. If rustup was
installed using its upstream installer, also follow its shell PATH instructions.
Inside this repository, `rust-toolchain.toml` selects Rust without changing
your global default.

Check the versions and native libraries in the same terminal used for builds:

```sh
node --version
pnpm --version
rustc --version
cargo --version
pkg-config --modversion gtk+-3.0 webkit2gtk-4.1 javascriptcoregtk-4.1 libsoup-3.0
```

Expect Node `v24.*`, pnpm `12.18.0`, Rust/Cargo `1.100.0`, and one version per
native library. `4.1` is the WebKitGTK API name; its reported package version
is normally `2.x`.

## Install dependencies and start development

```sh
pnpm install --frozen-lockfile
pnpm check:linux
pnpm tauri info
pnpm dev
```

`pnpm check:linux` checks the pinned tool versions, C compiler and native
development libraries in the current environment. It reports all missing
requirements and exits with a nonzero status if any check fails. It does not
install packages or verify the graphical window. Run it in Konsole on the host;
a successful host check does not supply missing libraries inside Flatpak.

`pnpm dev` invokes Tauri. Tauri starts `pnpm dev:web` on
`http://localhost:1420`, compiles Rust and opens the native KNOT window.
The first run needs network access for packages and Rust crates and can take
longer than subsequent runs. The window has native decorations and no browser
address bar. Use Ctrl+C in the launching terminal to stop the dev process.

The [native desktop settings](../../src-tauri/README.md) define a 1440×900
starting content size, a 960×640 minimum and the KNOT application icons.
The window requests centering and fitting within the monitor work area.

For a reproducible Cargo resolution during development, use:

```sh
pnpm dev -- --locked
```

`pnpm dev:web` is the frontend-only browser server. It does not verify the
native window or Rust integration. Avoid starting it separately while Tauri
is starting its own server on the same port.

## Check and build

```sh
pnpm check
pnpm build:web
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml --locked
pnpm build --no-bundle -- --locked
```

The frontend build is written to `dist/`. The native release executable is
`src-tauri/target/release/knot`. Both Cargo commands require native development
libraries. `pnpm build` builds the release app and all configured package
formats; on Arch, choose AppImage explicitly when only that artifact is needed:

```sh
pnpm build --bundles appimage -- --locked
ls src-tauri/target/release/bundle/appimage/
```

Tauri packages the already-built frontend and the native executable. Keep
`pnpm-lock.yaml` and `src-tauri/Cargo.lock` in version control. A frozen/locked
resolution error should be resolved by reviewing the dependency change and
updating the corresponding lockfile deliberately.

## Run a release without a dev server

Stop any development server first, then launch the executable:

```sh
./src-tauri/target/release/knot
```

The release loads its embedded frontend. Node, pnpm, Vite and a running server
are not needed at runtime. The unbundled executable still uses the host's
GTK/WebKitGTK runtime libraries. `pnpm preview` is a browser preview and does
not validate this release behavior.

For a user-local AppImage installation, select the file listed by the build
command. The following example assumes version `0.1.0` and x86_64; adjust the
source filename if the build reports a different name:

```sh
install -Dm755 src-tauri/target/release/bundle/appimage/KNOT_0.1.0_amd64.AppImage \
  "$HOME/.local/bin/knot.AppImage"
"$HOME/.local/bin/knot.AppImage"
```

This installs a standalone file in your user directory; a KDE application-menu
entry is not created by this command. Run it again after closing the terminal
that launched development to check independence from the dev server.
AppImage is the portable Linux artifact here; `.deb` and `.rpm` files are for
their respective package managers and are not CachyOS installation packages.

An AppImage built on rolling-release Arch can require newer system libraries
than older distributions provide. Broader Linux distribution needs a suitable
build baseline and separate validation; see the [Tauri AppImage limitations](https://v2.tauri.app/distribute/appimage/#limitations).

## Troubleshooting

| Symptom | Check or action |
| --- | --- |
| `node`, `pnpm` or `cargo` not found, or wrong version | Check `command -v node pnpm cargo rustc`, the version commands above and your host terminal's PATH. |
| `pkg-config` cannot find `webkit2gtk-4.1`, `javascriptcoregtk-4.1`, `gtk+-3.0` or `libsoup-3.0` | Install the native dependency list above; rerun the library check on the host. Installing packages on the host does not make them visible inside an unrelated Flatpak runtime. |
| C compiler, linker or `pkg-config` missing | Install `base-devel` and `pkgconf`. |
| Port 1420 already in use | Stop the previous KNOT/Vite process in its terminal. The fixed port must match `build.devUrl` in `src-tauri/tauri.conf.json`; Vite intentionally does not select another port. |
| `cannot open display` | Launch from your logged-in KDE desktop session, rather than a headless shell or plain SSH session. |
| Blank window, EGL/GBM failure or Wayland protocol error | Capture `pnpm tauri info` and terminal output; compare the display backends below and consult [Tauri Linux graphics troubleshooting](https://v2.tauri.app/develop/debug/linux-graphics/). |
| AppImage reports missing `libfuse.so.2` | Install [`fuse2`](https://archlinux.org/packages/extra/x86_64/fuse2/) with `sudo pacman -S --needed fuse2`, then launch the AppImage again. |
| Release reports missing shared libraries | Run `ldd src-tauri/target/release/knot` to identify missing libraries, and install the matching host runtime packages. |

For a display-backend comparison in KDE, run these separately, stopping the
first process before starting the second. X11 needs an X11 session or working
XWayland in the Wayland session:

```sh
GDK_BACKEND=wayland pnpm dev
GDK_BACKEND=x11 pnpm dev
```

For a renderer problem identified by the [Tauri graphics guide](https://v2.tauri.app/develop/debug/linux-graphics/),
try a process-local diagnostic run:

```sh
WEBKIT_DISABLE_DMABUF_RENDERER=1 pnpm dev
```

Record whether it changes the result. These commands are diagnostic overrides;
they are not enabled in the application or shell defaults.

## Manual Linux verification

For the first acceptance criterion, run `pnpm check:linux` and `pnpm dev`
from the repository root in Konsole. Wait for Rust compilation, then confirm:

1. A separate KNOT window appears with the heading and tagline visible.
2. The window has native controls and no browser tabs, address bar or toolbar.
3. Closing the window exits the native application; stop any remaining dev
   process with Ctrl+C and confirm that `pnpm dev` starts it again.

Record the date, environment and result below only after observing the window.
A running Vite server or a successful prerequisite check alone does not satisfy
this criterion.

Record the CachyOS/Plasma version, GPU/driver, display backend and output from
`pnpm tauri info` when checking the following:

- [ ] `pnpm dev` opens a native window and stops cleanly.
- [ ] The release executable starts after the dev server is stopped.
- [ ] The copied AppImage starts from outside the repository and starts again after closing.
- [ ] Resize, maximize, minimize and close work in KDE.
- [ ] Title, minimum size, work-area fitting and KNOT icon work in the window/task switcher; check the packaged launcher icon separately.
- [ ] Wayland and X11/XWayland are checked where available; record unsupported combinations.
- [ ] KDE scaling at 125% and 150% keeps text legible and content visible.
- [ ] UI review captures 1600×1000 and 1440×900 where a change affects the UI.

The initial scaffold passed TypeScript, frontend production build, Rust
formatting and browser smoke checks. Native compilation in the agent's
Flatpak runtime stopped at missing `javascriptcoregtk-4.1`; native startup,
packaging and the checks above still require verification on a prepared host.
The acceptance-criterion start attempt on 2026-11-12 confirmed that Vite starts
via `pnpm dev -- --locked`, but the native build is blocked by missing WebKitGTK
4.1 development libraries in the Flatpak runtime. The host prerequisite check
also found missing Node/pnpm/Rust on PATH and missing WebKitGTK 4.1. The native
window criterion remains unchecked until host setup and visual verification.
Product features and persistence are not implemented yet, so this checklist
does not claim note-saving or search verification.
