# Contributing to KNOT

KNOT is Linux-first. Shared UI and domain code must remain portable to Windows
and macOS. Read [the engineering preferences](AGENTS.md),
[module boundaries](src/README.md), and [design contract](docs/design/knot/README.md)
before changing application code.

## Prepare a Linux checkout

Use the [README quickstart](README.md#development) and install native dependencies
with the [CachyOS / Arch guide](docs/development/CACHYOS.md). The project selects
Node 24, pnpm from `packageManager`, and Rust from `rust-toolchain.toml`, including
rustfmt and Clippy. Use these versions in the same terminal that runs the build.

```sh
pnpm install --frozen-lockfile
pnpm check:linux
pnpm dev -- --locked
```

In a Flatpak terminal, use a prepared host terminal such as Konsole. A successful
host prerequisite check does not install libraries inside a sandbox.

## Branches and commits

Start the corresponding issue branch from current `main`. For example, for #5:

```sh
git fetch origin main
git switch -c '#5' origin/main
```

Keep commits small and reviewable. Use `#<issue> <type>: <description>`, with
`feat`, `fix`, `refactor`, `test`, `chore`, `ci`, or `docs`, for example
`#5 ci: check frontend formatting and lint`. Separate mechanical formatting from
behavior changes. Review lockfile changes and commit them with their dependency
changes. Never rewrite an applied database migration.

## Quality checks

Run from the repository root:

```sh
pnpm format:check
pnpm lint
pnpm check
pnpm test
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml --locked
pnpm exec playwright install chromium
pnpm test:ui
pnpm build --no-bundle -- --locked
```

`pnpm check` covers application code, tooling, and browser-test TSX fixtures.
`pnpm lint` rejects ESLint warnings as well as errors. The React rules enforce
hook ordering and dependencies; JSX rules catch common accessibility mistakes.
Compiler-specific React diagnostics are deferred until compiler adoption.
TypeScript handles undefined names in typed files; ESLint checks them in JavaScript.
Module boundaries remain defined in `src/README.md` and are reviewed in PRs.

Use `pnpm format` and `pnpm lint:fix` to apply available fixes, then inspect the
diff. Prettier formats supported frontend, configuration, and Markdown files;
rustfmt owns Rust. Generated files, lockfiles, and build/test output are excluded.
No local Git hook installation is required. Explain narrowly scoped lint
exceptions where they occur rather than disabling a rule across the project.

Add tests for user-visible behavior, error recovery, and regression risks.
Existing React tests use Testing Library and opt into jsdom per file. Native
storage tests use temporary databases, never a contributor's document profile.
Browser tests cover keyboard interaction, accessibility, both design reference
sizes, responsive layouts, and reduced motion. Their editable fixture is excluded
from normal production builds.

## Pull requests and CI

Reference the issue and explain the resulting behavior. Fill in the PR template
with actual commands/results and remaining manual checks. For visible UI changes,
include screenshots at 1600×1000 and 1440×900 and check keyboard/focus behavior,
accessibility, responsive layout, and reduced motion.

The Desktop build workflow runs on pushes, PRs, and manual dispatch:

- Frontend quality: formatting, ESLint, and explicit typechecks.
- Foundation: Vitest/React tests and Chromium accessibility/layout checks.
- Native matrix: rustfmt, native tests, and locked release compilation on Linux,
  Windows, and macOS. Linux also runs Clippy with warnings treated as errors.

Jobs run independently, and a failing command fails its step. On browser failure,
download `browser-failure-diagnostics` from the workflow run for the HTML report,
screenshots, and traces (retained for seven days). Reproduce a named step locally
before retrying; do not suppress failures. Run `actionlint` when changing workflows.

Build success establishes compilation, not native runtime parity. Start the Linux
release executable without Vite and record native rendering/interaction checks.
For persistence changes, follow the isolated-profile procedure in the
[storage review](docs/development/STORAGE-REVIEW.md). Document unperformed platform
runtime checks explicitly. Release publication and signing are separate work.
