# KNOT

> **Every thought is a thread. Every connection creates meaning.**

KNOT is a premium, local-first desktop note-taking application with a distinctive visual language based on threads, loops and knots.

**Primary target:** Linux (CachyOS / Arch / KDE Plasma); **planned portability:** Windows and macOS, sharing the same app code.

## Current status

**Planning and design phase.** No product implementation exists yet. Read the architecture and issue backlog before scaffolding the application.

- [25 detailed GitHub issues](https://github.com/vkunasegar/Knot/issues) across M0–M4
- [Project roadmap and milestone outcomes](docs/PROJECT-ROADMAP.md)
- [Technical architecture (Tauri 2, React/TypeScript, Rust, SQLite)](docs/architecture/TECH-STACK.md)
- [KNOT visual and interaction contract](docs/design/knot/README.md)
- [Automatic milestone/label bootstrap workflow](.github/workflows/bootstrap-planning.yml)

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
