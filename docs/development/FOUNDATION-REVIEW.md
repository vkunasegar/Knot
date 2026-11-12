# Issue #1 — Design, architecture and Definition of Done

This review applies to the M0 desktop scaffold, using the binding
[design contract](../design/knot/README.md), [architecture](../architecture/TECH-STACK.md)
and [roadmap/Definition of Done](../PROJECT-ROADMAP.md). It does not complete
the entire M0 milestone or the future product screens and persistence features.

## Design and architecture review

| Requirement | Current implementation and evidence |
| --- | --- |
| Written visual contract | Warm ivory `#F7F5F0`, charcoal `#252525`, a restrained serif title, sans-serif interface and 16/32 px spacing. Used values live in [`tokens.css`](../../src/shared/styles/tokens.css). App selectors are scoped to `.app`; the title uses `rem` to follow base text-size preferences. |
| Fonts and assets | System font stacks with fallbacks; no external font downloads or redistributed font files. The KNOT icon is original SVG artwork. The original six product mockups are still missing, as recorded in the design contract. |
| Modular shared code | `app` composes the view, `shared` supplies CSS tokens, and feature/data ownership follows the [module rules](../../src/README.md). No Linux business APIs in the frontend; see the [portability review](PORTABILITY.md#m0-frontend-portability-verification). |
| Native shell and security | Tauri 2, pinned toolchains/lockfiles, explicit local capability with no granted native permissions, no custom IPC commands or plugins. Production startup and installation were [verified on CachyOS](CACHYOS.md#production-build-and-installation-result). |
| Real data and persistence | The view contains only the product name and tagline. There are no fabricated notes, relationships, counters or saved-state claims. No product persistence exists yet; write/search/reopen, migrations and failure recovery must be tested with their actual features. |
| Scope and portability | Foundation work only. Native Linux startup is verified. Windows/macOS build jobs exist; their runtime behavior and installed-data workflows are not claimed as verified. |

## Reproduce the automated checks

Use the project Node/pnpm versions in a host terminal:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm exec playwright install chromium
pnpm test:ui
```

`pnpm test` runs five Vitest integration tests against the real Linux
prerequisite CLI, with isolated executable fixtures on PATH. They cover the
pnpm fallback without a shebang, missing WebKitGTK/JavaScriptCore, wrong or
missing pnpm and aggregated missing compiler/pkg-config errors. Fixture
executables exist only in temporary test directories and are removed afterward.
These Linux-specific tests skip on other OSes.

`pnpm test:ui` first type-checks and builds the production frontend, then runs
eight Playwright checks in Chromium at 1600×1000 and 1440×900. They cover the
accessible content tree and language, JavaScript/console failures, local-only
resource loading, axe WCAG 2 A/AA and 2.1 A/AA checks, reduced-motion mode,
200% base text size at the 960×640 minimum window size and screenshot capture.
This is browser testing of built frontend assets, separate from native Tauri
startup and WebView testing.

The initial view has no interactive controls, navigation or app shortcuts.
There is no app keyboard workflow or focus cycle to test yet; do not add dummy
controls to create one. The document has an English language declaration, a
`main` landmark and a level-one heading exposed in its accessibility tree.
Automated checks do not replace a manual screenreader assessment of WebKitGTK.

The [CI workflow](../../.github/workflows/desktop-build.yml) includes these
Foundation checks alongside the three native build jobs. In
[run 43320757969](https://github.com/vkunasegar/Knot/actions/runs/43320757969),
all three native builds passed for commit `a3c63de` (Ubuntu 24.04, Windows 2025
and macOS 15). The Foundation job exposed a test-only portability assumption:
the direct Node spawn of a script without a shebang failed on the developer
host but succeeded on the runner. The test now checks the actual prerequisite
CLI result without asserting that OS/Node implementation detail. All five
tests pass locally after the correction; remote verification of the fix is
still pending.

## Screenshots for review

These are actual Chromium captures of the built launch view at 100% text size
and device scale 1, reviewed on CachyOS. They show frontend content, without a
native frame. They are review evidence, not automated image-diff baselines and
not substitutes for the missing original product mockups.

| 1600×1000 | 1440×900 |
| --- | --- |
| ![KNOT launch view at 1600 by 1000](../review/issue-1/launch-1600x1000.png) | ![KNOT launch view at 1440 by 900](../review/issue-1/launch-1440x900.png) |

Screenshots from a new `pnpm test:ui` run are written to ignored
`test-results/` directories, one per test/project. Copy the two reviewed
`launch.png` files to the paths above when changing this view. Update both
sizes together and include this evidence in the PR description.

## Recorded result and remaining review

Verified on 2026-11-12: five CLI integration tests and eight UI checks passed,
including the frontend TypeScript/build checks. Both screenshots were visually
reviewed. Workflow syntax was checked with actionlint.
The updated native production executable also compiled successfully using
`pnpm build --no-bundle -- --locked`; the installed AppImage startup evidence
in the Linux guide refers to the earlier installation check.

### Native Linux assessment

On CachyOS / Plasma 6.8.2 in the Wayland desktop session, the installed
AppImage was closed through KWin's normal window-close operation and exited
with status 0. It then started again from outside the repository with no
listener on the development port. KWin confirmed native activation,
maximize/minimize/restore and resizing to the configured 960×640 content
minimum. The initial 1440×900 content size was also confirmed. These window
operations were exercised through KWin's native scripting API, not by
simulating an app workflow that does not yet exist.

The Linux AT-SPI tree exposed an application/frame, web document, main
landmark, heading named `KNOT` and the full tagline as paragraph text.
Orca 51.1 with Speech Dispatcher 0.12.1 was then started for an actual
screenreader assessment. The user switched to KNOT and confirmed that Say All
reads both the heading and complete tagline. Orca was stopped after the test.
The launch view has no interactive controls or app-level keyboard shortcuts;
additional navigation/focus tests are required when those features exist.

The external monitor was temporarily set to real KDE scales of 125% and 150%.
Both captures below were visually checked for readable, unclipped content.
The original 200% scale and the original KNOT window state were restored.
These native screenshots include the window frame and scale in physical
pixels; they supplement the exact-size browser captures above.

| Native at 125% | Native at 150% |
| --- | --- |
| ![Native KNOT window at 125 percent scale](../review/issue-1/native-hidpi-125.png) | ![Native KNOT window at 150 percent scale](../review/issue-1/native-hidpi-150.png) |

This tests the installed AppImage in a Wayland session; it does not establish
separate native Wayland and X11 protocol coverage. The user-local standalone
installation still has no desktop-menu entry. Its title-bar icon can fall back
to the WebView icon until desktop integration is installed; package/source
icons remain as documented in the native configuration guide.

### Dependency checks

`pnpm audit --prod` and the full `pnpm audit` including development dependencies
reported zero known advisories on 2026-11-12. Direct dependency license metadata is recorded
in the [portability guide](PORTABILITY.md); this is not a complete transitive
license audit.

RustSec `cargo-audit` 0.23.0 checked the locked Rust dependency graph against
database commit `af7b3ec33460b8e2de8d422e16d628518891a519`. Its vulnerability
count was zero, but it reported these two informational findings, which remain
open for dependency follow-up:

| Locked package | Finding and dependency path |
| --- | --- |
| `glib` 0.18.5 | [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html): unsound `VariantStrIter` methods can cause undefined behavior/crashes. The advisory lists a fix in glib >=0.20. Tauri's GTK 3 stack uses `gtk` 0.18, whose manifest requires `glib` 0.18, so forcing a newer direct dependency would not replace the affected transitive one. Track a compatible upstream update or reviewed backport; reachability in the native dependency stack has not been established. |
| `proc-macro-error` 1.0.4 | [RUSTSEC-2024-0370](https://rustsec.org/advisories/RUSTSEC-2024-0370.html): unmaintained build-time dependency, pulled in by `glib-macros` and `gtk3-macros`. The advisory lists no patched version. |

No advisory ignore rules or native dependency overrides were added. A zero
exit status from cargo-audit does not resolve these findings. To reproduce:

```sh
cargo install cargo-audit --version 0.23.0 --locked --root node_modules/.cache/knot-audit
./node_modules/.cache/knot-audit/bin/cargo-audit audit --file src-tauri/Cargo.lock
```

The findings were explicitly reviewed for M0. The locked glib source confirms
the immutable out-pointer in `VariantStrIter::impl_get`. The application has
no direct glib/Variant calls, IPC handlers or user-data processing; source
searches in the locked Tauri, Wry, Tao and GTK crates found no explicit call
to `array_iter_str`/`VariantStrIter`. This is not a proof of unreachability in
the full native stack. `proc-macro-error` is used by build-time procedural
macros, and runtime note content is not compiled as Rust. Both dependencies
come from the GTK 3 stack; keep their advisories visible and revisit compatible
upstream updates or a reviewed backport before extending native data handling
or preparing a broader release. No GTK API migration or unreviewed fork was
introduced to silence the audit.

- [x] Design and module boundaries reviewed for the current scaffold.
- [x] Relevant scaffold failure states have reproducible regression tests.
- [x] Semantic structure, automated accessibility, reduced motion and text resizing checked.
- [x] No fake product data or fake persistence in the current release path.
- [x] Screenshots at both required reference sizes prepared for review.
- [x] Native Linux AT-SPI and Orca assessment; full heading and tagline confirmed by the user.
- [x] Native KDE activation/window operations and HiDPI at 125% and 150%; real screenshots reviewed and original settings restored.
- [x] Explicitly review the two transitive RustSec findings; unresolved upstream dependency constraints and follow-up conditions are recorded above.
- [ ] Remote CI results, PR with screenshots and human review/merge.

Empty/loading/write-failure/recovery states belong to the features that
introduce loading and persistence. They are not simulated in the production
scaffold. Recheck the installed release whenever runtime behavior changes.
