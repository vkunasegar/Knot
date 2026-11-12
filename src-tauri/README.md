# Native desktop configuration

[`tauri.conf.json`](tauri.conf.json) configures the desktop shell shared by
Linux, Windows and macOS. Keep platform-specific business logic out of the UI;
see the [architecture](../docs/architecture/TECH-STACK.md).

## Application identity and window

| Setting | Value |
| --- | --- |
| Product name / window title | `KNOT` |
| Application identifier | `io.github.vkunasegar.knot` |
| Main window label | `main` |
| Initial content size | 1440×900 logical pixels |
| Minimum content size | 960×640 logical pixels |
| Placement | Centered, constrained to the available monitor work area |
| Window controls | Native decorations, resizing and standard OS controls |
| Window/WebView background | Warm ivory `#F7F5F0` |

The starting size matches one of the design reference sizes; also review at
1600×1000. Dimensions are logical pixels, so physical screenshots vary with
desktop scaling. The window manager may determine placement on Wayland.
`preventOverflow` requests that the starting window fit within the work area;
verify this on the actual KDE/HiDPI setup, especially near the minimum size.

Keep the application identifier stable across releases: it is the app's
packaging and OS identity and can affect application data locations. The
internal window label matches the capability scope below. Native window
controls do not require JavaScript permissions or a custom title bar.

## Icons

[`assets/app-icon.svg`](assets/app-icon.svg) is the original editable KNOT
artwork: a single terracotta thread with three woven crossings on warm ivory,
with transparent outer corners. It uses the project's design colors and
contains no fonts or external resources.

The PNG, ICO, ICNS and Windows tile assets in [`icons/`](icons/) are generated
from this source using the installed Tauri CLI. `bundle.icon` selects the PNG
sizes for Linux and the platform containers for Windows and macOS. All desktop
assets, including tiles, are kept in sync with the SVG.

To regenerate from the repository root:

```sh
pnpm tauri icon src-tauri/assets/app-icon.svg --output /tmp/knot-icons
```

Copy only the files directly inside `/tmp/knot-icons/` into `src-tauri/icons/`.
The generator also produces Android/iOS subdirectories; this desktop project
does not commit those mobile outputs. Review the PNGs at 32 and 128 pixels,
then commit the source and generated desktop files together. Follow the
[Tauri icon guide](https://v2.tauri.app/develop/icons/) for supported formats.

## Capabilities and content policy

`app.security.capabilities` explicitly selects only `main-window`, defined in
[`capabilities/main-window.json`](capabilities/main-window.json). Its scope is
the local `main` window; it grants an empty permission list. The current app
does not register frontend-facing Rust commands or use native plugins, so it
does not need core, filesystem, shell, opener or global-shortcut permissions.
Global `window.__TAURI__` injection is disabled.

Add a narrowly scoped permission only when its feature needs it. Scope it to
the relevant window and resources; review new Rust commands and plugin access
together with their capability definitions. Additional capability files are
not automatically selected by this configuration. See the [Tauri capability
model](https://v2.tauri.app/security/capabilities/).

The production CSP permits local app content and native IPC. The development
CSP additionally permits the local Vite HTTP/WebSocket endpoints. Inline
styles support local UI styling; remote scripts and arbitrary remote network
endpoints are not allowed by these policies. Tauri may add the nonces/hashes
and protocol sources required by its runtime.

## Verification

Check configuration fields against the schema shipped with
`@tauri-apps/cli`, regenerate the icons, then use the [CachyOS guide](../docs/development/CACHYOS.md)
to build and verify on a prepared host. Check the title, native controls,
initial/minimum sizing and icon in the KDE window/task switcher and packaged
launcher. Platform icon containers are generated for Windows/macOS; their
appearance still needs verification on those systems.

The configuration and icon assets can be validated without GTK/WebKitGTK.
Native window behavior and installed-app integration cannot be confirmed in
the agent's current Flatpak runtime because the native libraries are missing.
