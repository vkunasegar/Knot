# Desktop portability and dependency choices

Linux remains the primary platform. Windows and macOS use the same React UI
and Rust application entry point. This document records the initial dependency
review and the checks that keep later features portable.

## Initial dependency review

The versions below come from `pnpm-lock.yaml` and `src-tauri/Cargo.lock`.
The license column records direct package metadata, not a full transitive
license audit or distribution approval.

| Dependencies | Locked versions | License metadata | Portability decision |
| --- | --- | --- | --- |
| `react`, `react-dom` | 19.3.1 | MIT | Browser UI; no native OS requirement in the frontend. |
| `@tauri-apps/api` | 2.12.4 | Apache-2.0 OR MIT | Shared typed desktop API; native calls belong behind the module boundaries. |
| `@tauri-apps/cli` | 2.12.4 | Apache-2.0 OR MIT | Development tool with Linux, Windows and macOS binaries. |
| `vite`, `@vitejs/plugin-react` | 8.3.8, 6.3.0 | MIT | Development/build tools; Node 24 satisfies their engine requirements. The lockfile includes Rolldown binaries for the three desktop OSes. |
| `typescript` | 6.0.3 | Apache-2.0 | Build-time checking; no native runtime requirement. |
| `@types/node`, `@types/react`, `@types/react-dom` | 24.19.2, 19.3.0, 19.3.0 | MIT | Build-time declarations only; Node types are scoped to Vite's tooling configuration. |
| Rust `tauri`, `tauri-build` | 2.12.5, 2.7.4 | Apache-2.0 OR MIT | Shared shell/build integration; platform-specific WebView dependencies are selected by the crates' target configuration. |

No direct dependency currently needs a platform-specific replacement.
GTK/WebKitGTK entries in Cargo.lock are expected Linux shell dependencies;
they do not imply that Windows or macOS must compile GTK. Native Node packages
are build tools, not additional runtime processes shipped with the app.

The existing `knot_lib` Rust library name avoids a library/executable name
collision on Windows. The Windows release entry point uses the GUI subsystem
so a console window is not opened alongside the application.

## M0 frontend portability verification

The source review on 2026-11-12 covered all current frontend implementation
files: `src/main.tsx`, `src/app/index.ts`, `src/app/App.tsx`, `src/app/App.css`,
`src/shared/styles/tokens.css` and `src/vite-env.d.ts`. They contain only React
composition, static text,
browser styling and Vite type declarations. There are no Node imports, native
commands, OS branches, hardcoded Linux paths or Linux-only business APIs in
the frontend. CSS font-smoothing prefixes do not introduce business logic.

The `features` and `data` directories currently contain architecture
documentation; `shared` supplies CSS tokens. There is no business logic or
persistence implementation to verify.
The Linux-specific prerequisite checker lives under `scripts/`, outside the
frontend and its runtime bundle. This satisfies the frontend portability
criterion for the current scaffold; repeat the review when adding features.

The Foundation review adds development-only test tools: `vitest` 5.1.0
(MIT), `@playwright/test` 1.65.0 (Apache-2.0) and `@axe-core/playwright` 4.14.0
(MPL-2.0), based on their installed package metadata. Their Node requirements
fit Node 24; Vitest supports the selected Vite 8 version. They are not imported
by `src` or included in the production UI bundle. Browser binaries are test
tools installed separately. The Linux-only prerequisite integration tests are
skipped on other platforms; the browser test commands are platform-neutral.

## Rules for new dependencies

- Confirm desktop OS and CPU support, WebView compatibility, Node/Rust version requirements and available native binaries before adding a dependency. Check license terms and transitive native components before distribution.
- Prefer browser APIs and shared TypeScript for feature logic. Use typed injected services for native work, following the [module boundaries](../../src/README.md). `node:*` imports belong in build tooling, not the WebView frontend.
- Keep OS-specific integration in Rust or data adapters. Use Tauri app-data directories and path APIs rather than hardcoded Linux, macOS or Windows paths. Guard target-specific Rust dependencies with the appropriate `cfg` table when needed.
- Keep package scripts portable: avoid Unix-only commands, platform-specific environment-variable syntax and host paths. Linux package installation in CI is scoped to its Linux job.
- Retain optional native binaries for other supported platforms in the lockfile. Install with frozen/locked resolution in CI and review lockfile changes alongside dependency changes.
- Use the OS-appropriate Ctrl/Cmd modifier for shortcuts. Feature behavior, keyboard navigation and save status must not depend on which WebView or desktop environment runs the app.

Editor, graph and SQLite implementation packages remain future choices.
Review them against these rules when their feature is introduced; the planning
ADR does not mean those dependencies are already installed or validated.

## Native build smoke checks

The [Desktop build workflow](../../.github/workflows/desktop-build.yml) runs
on pushes, pull requests and manual dispatch. The initial runner matrix is:

| Runner | Coverage |
| --- | --- |
| `ubuntu-24.04` | Linux x64 with GTK/WebKitGTK 4.1 development libraries |
| `windows-2025` | Windows x64 using the runner's MSVC toolchain |
| `macos-15` | macOS on the runner's native Apple Silicon architecture |

Runner labels and architectures follow the [GitHub-hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
Intel macOS, Windows ARM64 and Linux ARM64 are not covered by this matrix.

Each job selects Node from `.node-version`, pnpm from `package.json` and Rust
plus rustfmt from `rust-toolchain.toml`. It installs with the frozen pnpm
lockfile, checks Rust formatting, and runs:

```sh
pnpm build --no-bundle -- --locked
```

Tauri's build hook checks TypeScript and builds the frontend before compiling
the native release executable. The three jobs run independently so a failure
on one platform remains visible without cancelling the other platforms.
An additional Linux Foundation job runs the prerequisite regression tests,
then builds and checks the UI with Chromium/axe in both design reference sizes.
Action references are pinned to release commits. The workflow uses read-only
repository permissions and builds without release publication or signing.

Successful jobs demonstrate compilation on those runners. They do not verify
GUI startup, WebView rendering, installer generation, signing, notarization or
installed-app behavior. Record the first CI results after pushing this workflow;
until then, Windows/macOS build success remains unconfirmed. Track discovered
platform failures in the issue backlog rather than suppressing them.

## Local Windows and macOS checks

Use the project Node/pnpm/Rust versions on the target OS. Windows needs the
Microsoft C++ Build Tools with the desktop C++ workload and WebView2; macOS
needs Xcode command-line tools. Follow the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).

From the repository root on either platform:

```sh
rustup toolchain install 1.100.0 --profile minimal --component rustfmt
pnpm install --frozen-lockfile
pnpm dev
```

After stopping development, build and run the release:

```sh
pnpm build --no-bundle -- --locked
```

| Platform | Native executable from the repository root |
| --- | --- |
| Windows PowerShell | `.\src-tauri\target\release\knot.exe` |
| macOS terminal | `./src-tauri/target/release/knot` |

Check native title-bar controls, icon, focus, scaling, text rendering, input
and Ctrl/Cmd shortcuts as features appear. Capture UI at 1600×1000 and 1440×900.
The two WebViews can render fonts and text layout differently from Linux.

For Linux development, installation and outstanding native verification, use
the [CachyOS guide](CACHYOS.md). Distribution packaging and signing remain
separate from this dependency/build foundation.
