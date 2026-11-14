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
indicator.

`createDomainRepositories` composes typed note, connection, collection and thread
repository classes around an injected native invocation client. It performs no IO
at construction. The native service lazily opens the app-data SQLite file and owns
its connection and transactions. Data adapters validate responses and expose stable
`StoreError` codes; they never cache documents, substitute browser storage or retry
writes automatically. Features receive only the repository contracts they need.

The [domain contract](../../docs/architecture/DOMAIN-MODEL.md) documents membership
ordering, revisions, archive/trash/purge, migration immutability and recovery.

See the [module responsibilities and dependency rules](../README.md).
