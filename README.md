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

Follow the [CachyOS / Arch / KDE development guide](docs/development/CACHYOS.md)
for tool installation, native WebKitGTK dependencies, release builds,
AppImage installation and troubleshooting.

With Node.js 24, pnpm 12.18.0, Rust 1.100.0 and the native libraries prepared,
run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` launches the native Tauri app. `pnpm build` creates release artifacts;
`pnpm build --bundles appimage -- --locked` selects AppImage for CachyOS.
`pnpm check` checks TypeScript and `pnpm build:web` builds only the frontend.
The [guide](docs/development/CACHYOS.md) distinguishes browser checks from native
and installed-app verification, which is still pending on a prepared host.

Windows development requires the Microsoft C++ build tools and WebView2;
macOS requires Xcode command-line tools. Build and verify on each target OS,
using the [platform prerequisites](https://v2.tauri.app/start/prerequisites/).

The [native desktop configuration](src-tauri/README.md) documents window
dimensions, the stable application ID, KNOT icons and the minimal capabilities.
No database, filesystem, shell, or external-link plugin is enabled.

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
