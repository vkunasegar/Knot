# KNOT — Roadmap, milestone scope and delivery rules

No speculative due dates: milestones represent demonstrable user outcomes. Every issue title begins with an M0–M4 prefix until GitHub milestones are assigned.

| Milestone | Outcome / Exit Gate |
| --- | --- |
| **M0 — Foundation & Design** | Tauri launches on Linux, unified design tokens and shell, typed domain/storage contracts and migrations. |
| **M1 — Reliable Notes Core** | Create/edit/reopen a rich note, no silent data loss, archive/favorites/recovery, meaningful links, export/import. |
| **M2 — Everyday Workflows** | Home quick capture, Collections, ordered Threads, search/command palette, settings. |
| **M3 — KNOT Experience** | The Weave map, editing connections, contextual inspector, Focus Mode, purposeful signature motion. |
| **M4 — Linux Release & Portability** | Accessibility, Linux packaging, automated tests/CI, Windows/macOS smoke builds and release documentation. |

## Milestone acceptance
1. All P0 issues within the milestone are merged and manually reviewed on Linux.
2. User workflow can be completed entirely by keyboard; visible focus and reduced-motion states are checked.
3. UI compared at 1600×1000 and 1440×900 plus Linux HiDPI.
4. Empty, loading, offline, failed writes, many notes and recovery states are covered.
5. Requirements and reference docs updated with real behavior and known limitations.

## Delivery order
M0 -> M1 -> M2 -> M3 -> M4. Weave design probes may run during M1 but must not delay reliable writing. Avoid building the graph before domain links, membership and persistence are settled. Launch the editor before complex motion.

## Issues and labels
Labels `phase:M0` … `phase:M4`, `type:feature`, `type:foundation`, `type:quality`, `priority:P0`, `priority:P1`, `platform:linux`, `platform:cross-platform` are added by the project bootstrap automation. Each issue carries independently reviewable checklists and tests.

## Definition of Done
No TODO-only implementation, no fake persistence, no hardcoded relationships in release UI. Changes must satisfy acceptance criteria, keyboard interaction, regression tests and reference designs. Keep `main` releasable and use feature branches with PRs.
