# Frontend module structure

`main.tsx` mounts React and imports the public application entry point from `app`.
The native process lives in `../src-tauri`.

| Directory | Responsibility |
| --- | --- |
| `app/` | Application composition: shell, global styles, navigation, providers and service wiring. |
| `features/` | User workflows such as notes, collections, threads and search; each feature owns its UI, hooks and workflow logic. |
| `shared/` | Reusable UI primitives, design tokens, utilities and platform-neutral types used by multiple modules. |
| `data/` | Typed service/repository contracts, persistence adapters and translation between domain values and native command payloads. |
| `design-preview/` | Internal visual catalogue mounted only by `/design-preview.html`; never imported by the application. |

## Dependency rules

| Module | Allowed dependencies within `src` |
| --- | --- |
| `main.tsx` | Public `app` entry point |
| `app` | Feature entry points, data contracts and factories, shared modules |
| A feature | Its own internals, shared modules, type-only imports from data contracts |
| Data contracts | Shared platform-neutral types and other data contracts |
| Data adapters | Data contracts, shared modules and native integration libraries |
| `shared` | Other shared modules |
| `design-preview` | `shared` modules only |

- `app` creates concrete data services and supplies them to features through props or providers. UI code calls the typed service interface; it does not import an adapter or invoke Tauri directly.
- A feature does not import another feature. Compose workflows in `app`, or extract a genuinely shared primitive or type into `shared`.
- Keep dependencies acyclic. `shared` and `data` do not import features or the application. Data code does not import UI components.
- `@tauri-apps/*`, SQL and filesystem integration belong behind `data` adapters. Window/menu lifecycle wiring belongs in `app` or Rust. Shared frontend business logic uses platform-neutral values and interfaces.
- Use a module's explicit `index.ts` for TypeScript imports from outside that module. Keep private imports relative within the module. Export only the interface that callers need; create entry points when implementation exists. The shared CSS token file is a public stylesheet imported by the app's global styles.
- Keep tests and scoped styles next to the implementation they cover. `app/App.css` imports the shared document defaults; the desktop shell owns its scoped styles and uses the existing shared design tokens.

## Growing the structure

Create a directory such as `features/notes/` when its workflow is implemented.
It can contain `ui/`, `hooks/` and `model/` as its size requires, with an
`index.ts` exposing its public components. Feature-specific types stay inside
the feature until another module needs them.

Add service interfaces such as `NoteService` under `data/contracts/` and
concrete Tauri implementations under `data/adapters/` when persistence is
implemented. `data/index.ts` will expose the factories needed by `app`;
`data/contracts/index.ts` will expose types needed by features. Database
connections, transactions and migrations belong to the Rust persistence layer.

The application composes the desktop shell through `app/shell/index.ts`.
`NavigationController` owns typed hash navigation and session-bounded history;
`ShellPreferencesService` owns layout state through an injected data contract.
The browser storage adapter persists only versioned UI preferences. Future note
repositories remain native and separate from these preferences. The optional
`ShellDocument` contract supplies a title, confirmed save status and an editor
focus callback without transferring document ownership to the shell. The editor
and context slots remain mounted when panels or Focus Mode change.

`features` does not yet provide note workflows. Automated import-boundary
linting is not configured yet.

See the [technical architecture](../docs/architecture/TECH-STACK.md) and the
[design contract](../docs/design/knot/README.md).
