import React from "react";
import ReactDOM from "react-dom/client";
import { DesignPreview } from "./DesignPreview";

/**
 * Entry point for `design-preview.html`.
 *
 * Completely separate from `src/main.tsx`: the Tauri window loads `index.html`
 * only, so none of the preview fixtures or controls enter the production path.
 */
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DesignPreview />
  </React.StrictMode>,
);
