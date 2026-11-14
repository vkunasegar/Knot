# Data

Place typed service/repository interfaces in `contracts/` and concrete platform
integration in `adapters/` when those implementations are introduced. Keep
command payload translation and persistence error mapping at this boundary.

The application constructs adapters; features receive service interfaces.
Rust owns database access, transactions and migrations. Durable write
acknowledgements must determine the UI's saved state.

The initial `ShellPreferencesStorage` contract and
`BrowserShellPreferencesStorage` adapter store only layout preferences in the
WebView's local storage under `knot.shell.preferences.v1`. Storage is acquired
lazily so policy and quota errors reach the service recovery boundary. The
application's `ShellPreferencesService` validates the version and boolean fields,
keeps usable session state when writes fail, and exposes a recovery warning.
This store contains no document data and never determines a document's save
indicator. Native note storage remains part of Issue #4 and later workflows.

See the [module responsibilities and dependency rules](../README.md).
