# KNOT

> **Every thought is a thread. Every connection creates meaning.**

KNOT is a premium, local-first desktop note-taking application with a distinctive visual language based on threads, loops and knots.

**Primary target:** Linux (CachyOS / Arch / KDE Plasma); **planned portability:** Windows and macOS, sharing the same app code.

## Current status

**M0 — initial application scaffold.** Tauri 2 hosts a minimal React/TypeScript UI built with Vite. Product features and persistence are not implemented yet.

- [25 detailed GitHub issues](https://github.com/vkunasegar/Knot/issues) across M0–M4
- [Project roadmap and milestone outcomes](docs/PROJECT-ROADMAP.md)
- [Technical architecture (Tauri 2, React/TypeScript, Rust, SQLite)](docs/architecture/TECH-STACK.md)
- [Frontend module structure and dependency rules](src/README.md)
- [KNOT visual and interaction contract](docs/design/knot/README.md)
- [Automatic milestone/label bootstrap workflow](.github/workflows/bootstrap-planning.yml)

## Development

Prerequisites: **Node.js 24 LTS**, **pnpm 12.18.0**, and **Rust 1.100.0 through rustup**. The Node major is recorded in `.node-version`, pnpm in `package.json`, and Rust in `rust-toolchain.toml`. Install Node and [rustup](https://rustup.rs/) first, then install the pinned package manager:

```sh
npm install --global pnpm@12.18.0
```

On CachyOS / Arch, install the native development dependencies in a host terminal, following the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux):

```sh
sudo pacman -Syu
sudo pacman -S --needed base-devel webkit2gtk-4.1 curl wget file openssl \
  appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
```

Use WebKitGTK **4.1**; the 4.0 package is not a substitute. If Cargo reports missing `gtk+-3.0`, `javascriptcoregtk-4.1`, `libsoup-3.0`, or `webkit2gtk-4.1`, check that their development files are available in the environment where Cargo runs. A Flatpak terminal may not expose packages installed on the host; run these commands in a host terminal such as Konsole.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` starts Vite on port 1420 and opens the native Tauri window. The first run downloads and compiles Rust dependencies. Port 1420 must be available; close the window or press Ctrl+C to stop development.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Native desktop app with hot reload |
| `pnpm check` | Type-check frontend and Vite configuration |
| `pnpm build:web` | Type-check and bundle frontend into `dist/` |
| `pnpm build` | Build native release app and platform packages |
| `pnpm build --no-bundle -- --locked` | Build native release executable using the existing Cargo lockfile |
| `pnpm dev:web` | Frontend-only development server |
| `pnpm preview` | Browser preview of an existing frontend build |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Check Rust formatting |

On Linux, the release executable is `src-tauri/target/release/knot`; packages are written below `src-tauri/target/release/bundle/`. The release app embeds `dist/` and does not need Vite or Node at runtime. Native WebKitGTK/GTK runtime libraries are still required. Linux package installation and installed-app verification remain part of the foundation issue; a `.deb` is not an Arch package.

Commit both `pnpm-lock.yaml` and `src-tauri/Cargo.lock`. No database, filesystem, shell, or external-link plugin is enabled. The bundled icons are Tauri template placeholders pending the dedicated app-configuration step.

Windows development requires the Microsoft C++ build tools and WebView2; macOS requires Xcode command-line tools. Build and verify on each target OS, using the [platform prerequisites](https://v2.tauri.app/start/prerequisites/).

## Planned user experience

| Area | What makes it KNOT |
| --- | --- |
| Home | Quick capture, real recent notes and active thought threads |
| Note editor | Calm, editorial writing with honest autosave and a connection inspector |
| The Weave | Distinctive flowing graph, with semantic connections and accessible list alternative |
| Collections | Curated notes represented by meaningful miniature knots |
| Search | Instant Ctrl/Cmd+K palette for notes, collections, threads and actions |
| Focus Mode | Distraction-free version of the very same editor/document |

## Visual identity

Warm ivory `#F7F5F0` · paper white `#FFFEFB` · charcoal `#252525` · muted terracotta `#C66B54` · ink blue `#405B72`. Semantic continuous threads, not random decoration.

## Technology direction

Tauri 2 desktop shell, React + TypeScript + Vite UI, Rust native layer, SQLite local data, Tiptap/ProseMirror rich-text editing and a customized 2D graph renderer. Linux native requirements and cross-platform WebView differences are documented in [the architecture decision](docs/architecture/TECH-STACK.md).

## Planning milestones

- **M0 — Foundation & Design**
- **M1 — Reliable Notes Core**
- **M2 — Everyday Workflows**
- **M3 — KNOT Experience**
- **M4 — Linux Release & Portability**

### Activate GitHub milestones

The workflow [`bootstrap-planning.yml`](.github/workflows/bootstrap-planning.yml) will create the milestones, phase/priority labels and assign matching `[M0]`–`[M4]` issues. Run it from **Actions → Bootstrap KNOT milestones and issue labels → Run workflow**, after enabling Actions and giving the workflow token permission to write issues if required. The workflow is idempotent and can be rerun safely. Milestones do not have arbitrary delivery dates.

## Design assets

The original high-fidelity mockups were produced in the planning/design package. The repo's design directory currently contains a written contract; the full-resolution binary PNG mockups have **not yet been committed**. Upload them to `docs/design/knot/assets/` before treating issue image attachments as complete.

## Contribution workflow

Work on feature branches, create small focused PRs, reference the corresponding issue, verify on Linux, and keep shared features free from platform-specific assumptions.
