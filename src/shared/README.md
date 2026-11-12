# Shared

Place reusable UI primitives, design tokens, utilities and platform-neutral
types here when multiple modules need them. Keep feature-specific behavior
with its feature. Shared modules depend only on other shared modules and
general-purpose libraries.

[`styles/tokens.css`](styles/tokens.css) holds the colors, system-font stacks
and spacing currently used by the launch view. The title size uses `rem` so
it follows the user's base text size. Add further tokens when their UI needs
them, using the [design contract](../../docs/design/knot/README.md). No external
font files are distributed by the scaffold.

See the [module responsibilities and dependency rules](../README.md).
