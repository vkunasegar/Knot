import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "dist/**",
    "src-tauri/target/**",
    "src-tauri/gen/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    extends: [js.configs.recommended],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ["src/**/*.{ts,tsx}", "tests/ui/fixtures/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["*.{js,mjs,ts}", "scripts/**/*.mjs", "tests/**/*.ts"],
    ignores: ["tests/ui/fixtures/**"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.tsx"],
    extends: [jsxA11y.flatConfigs.recommended],
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    // Compiler-specific diagnostics are deferred until compiler adoption. These
    // two rules protect hook ordering and subscriptions in the current runtime.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  // Prettier owns presentation; ESLint owns correctness.
  prettier,
]);
