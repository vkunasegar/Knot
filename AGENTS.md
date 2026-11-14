# KNOT engineering preferences

- Prefer an object-oriented, defensive approach for stateful application services and adapters. Use small classes with explicit contracts, dependency injection and composition; keep React presentation in focused functional components.
- Keep code clean and responsibilities separate. Respect the module boundaries in `src/README.md`; expose only the public interfaces needed by callers.
- Validate data at storage and platform boundaries. Recover from expected failures without crashes, false success states or loss of document data.
- Document public contracts, lifecycle ownership and non-obvious invariants with meaningful comments. Explain why a safeguard exists instead of narrating obvious statements.
- Add tests for user-visible behavior, error recovery and regression risks. Verify keyboard interaction, accessibility, responsive layout and reduced motion when changing UI.
- Keep changes on the corresponding issue branch. Use small, meaningful commits with the issue number, and document actual verification results and remaining manual checks.
