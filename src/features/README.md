# Features

Place each user workflow in its own module, such as `notes`, `collections`,
`threads` or `search`, when implementation begins. Keep its UI, workflow logic,
styles and tests together, and expose its public API through `index.ts`.

Features use shared primitives and injected data-service contracts. Application
composition connects features and supplies concrete services.

See the [module responsibilities and dependency rules](../README.md).
