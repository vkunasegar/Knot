import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
const rootDir = fileURLToPath(new URL(".", import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  build: {
    rollupOptions: {
      // Independent app and catalogue entries. Browser-test mode additionally
      // builds an isolated document host to verify the shell's editor contract.
      input: {
        main: resolve(rootDir, "index.html"),
        designPreview: resolve(rootDir, "design-preview.html"),
        // The editable shell host exists only in browser-test builds. It is
        // absent from native/release builds and never imported by the app.
        ...(mode === "test"
          ? {
              shellDocumentTest: resolve(
                rootDir,
                "tests/ui/fixtures/document.html",
              ),
            }
          : {}),
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
