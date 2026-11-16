# Issue #5 verification and contribution quality

Issue #5 extends the existing M0 tests and desktop build matrix with frontend
linting/formatting, explicit typechecks, Rust linting, and a documented contribution
process. It changes no product workflow, public domain API, database schema, or
native command permissions. Tooling/contribution changes, the one-time Prettier
pass, and verification documentation are isolated in separate issue commits.

## Quality contracts

- `pnpm format:check`: read-only Prettier check of supported source, configuration,
  and Markdown files. `pnpm format` writes fixes. Generated files, lockfiles, and
  build/test artifacts are excluded; Rust remains owned by rustfmt.
- `pnpm lint`: ESLint recommended JavaScript/TypeScript rules, hook ordering and
  dependencies, and recommended JSX accessibility rules. Warnings fail the check.
  `pnpm lint:fix` applies available fixes. Browser and Node contexts are separated.
- `pnpm check`: application, tooling, and a separate test configuration, including
  the browser-only TSX document host previously outside the TypeScript file set.
- Rust: pinned rustfmt and Clippy, with Clippy checking all targets on Linux and
  treating warnings as errors. Existing native tests remain active on all OSes.
- CI: the frontend quality job runs independently of the existing Foundation and
  native jobs. Each quality command has its own named step. The existing Linux,
  Windows, and macOS matrix remains active on every push/PR and manual dispatch.
- Browser failures retain an HTML report, traces, and screenshots in
  `browser-failure-diagnostics` for seven days. Artifact upload is failure-only,
  read-only repository permissions remain, and action versions are SHA-pinned.

Two local lint exceptions preserve intentional existing behavior: the search
combobox owns keyboard focus and activates listbox options with Enter; the native
adapter test deliberately supplies a sparse array to verify rejection before IPC.
Neither exception disables its rule for other code. React Compiler-specific lint
rules and automated module-boundary enforcement are not introduced in this issue.

The new development-only dependencies are pinned in `package.json` and the pnpm
lockfile. ESLint/`@eslint/js` use 9.39.5 because the current
`eslint-plugin-jsx-a11y` 6.10.2 declares support through ESLint 9. The registry marks
ESLint 9 as deprecated; moving to ESLint 10 requires a compatible accessibility
plugin. This constraint is recorded rather than overriding peer requirements.
Other direct additions are `eslint-config-prettier` 10.1.8,
`eslint-plugin-react-hooks` 7.1.1, `globals` 17.14.0, Prettier 3.10.1, and
`typescript-eslint` 8.72.2. The installed versions pass peer checks with Node
24.22.3 and TypeScript 6.0.3. No runtime application dependency is added.

## Recorded local verification

Verified on 2026-11-16 on the prepared Linux/KDE host. Commands ran on the host
through `flatpak-spawn` because the agent's Flatpak environment does not expose
Node/Cargo on its own PATH.

| Check                                                                                               | Actual result                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`; `pnpm peers check`                                                | Passed; locked resolution and no peer dependency issues.                                                                                                                                                                                   |
| `pnpm format:check`                                                                                 | Passed after the isolated formatting commit.                                                                                                                                                                                               |
| `pnpm lint`                                                                                         | Passed with zero warnings/errors.                                                                                                                                                                                                          |
| `pnpm check`                                                                                        | Passed for application, tooling, and test TSX fixtures.                                                                                                                                                                                    |
| `pnpm test`                                                                                         | 105 tests passed in 18 files, including five new ESLint configuration regression tests.                                                                                                                                                    |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`                                         | Passed.                                                                                                                                                                                                                                    |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked --offline -- -D warnings` | Passed.                                                                                                                                                                                                                                    |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`                                | 15 native tests passed; binary/doc targets also passed.                                                                                                                                                                                    |
| `CI=true pnpm test:ui`                                                                              | 38 tests passed at 1600×1000 and 1440×900; CI HTML reporter exercised.                                                                                                                                                                     |
| `pnpm check:linux`                                                                                  | Passed for pinned tools and required native libraries.                                                                                                                                                                                     |
| `pnpm build --no-bundle -- --locked`                                                                | Linux native release build passed; normal production inputs exclude the editable browser fixture.                                                                                                                                          |
| `actionlint` 1.7.11                                                                                 | Both workflows passed; binary downloaded from the official release and checked against its published SHA-256 checksum.                                                                                                                     |
| Lint/format negative CLI probes                                                                     | Intentionally invalid stdin returned exit code 1; ESLint reported source location and rule names. No invalid files were created.                                                                                                           |
| Native WebKitGTK smoke                                                                              | Release started without Vite, using isolated XDG data/config/cache. GI AT-SPI verified Home, seven navigation links, All Notes navigation/heading, and the search palette. The test process was stopped and its temporary profile removed. |

The browser suite covers keyboard navigation, focus restoration, axe checks,
responsive/minimum sizes, contrast, reduced motion, and editor-slot retention.
Existing React keyboard tests and Rust migration/CRUD/recovery tests supply the
issue's required real test examples. No visible product UI change requires new
review screenshots.

## CI and remaining review

The first Issue #5 push and its Linux/Windows/macOS workflow results are pending.
Record the run URL and actual outcomes here after publication. Local compilation
and browser checks do not establish native Windows/macOS runtime behavior.

Remaining manual checks: human code review, a fresh contributor following the
Linux quickstart, and native Windows/macOS interaction checks when available.
The real GitHub artifact upload path only runs on a browser CI failure; local
verification exercises report generation, not upload or hosted retention.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for all commands and commit/PR rules.
