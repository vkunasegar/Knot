# Data

Place typed service/repository interfaces in `contracts/` and concrete native
integration in `adapters/` when those implementations are introduced. Keep
command payload translation and persistence error mapping at this boundary.

The application constructs adapters; features receive service interfaces.
Rust owns database access, transactions and migrations. Durable write
acknowledgements must determine the UI's saved state.

See the [module responsibilities and dependency rules](../README.md).
