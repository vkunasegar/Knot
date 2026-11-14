/** Browser-only contract fixture; excluded from production build inputs. */
import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DesktopShell,
  NavigationController,
  ShellPreferencesService,
} from "../../../src/app/shell";
import { BrowserShellPreferencesStorage } from "../../../src/data";
import "../../../src/app/App.css";

function DocumentTestHost() {
  const editor = useRef<HTMLTextAreaElement>(null);
  const [navigation] = useState(() => new NavigationController(window));
  const [preferences] = useState(
    () => new ShellPreferencesService(new BrowserShellPreferencesStorage()),
  );
  const [body, setBody] = useState("A thought worth keeping.\n".repeat(100));
  return (
    <DesktopShell
      navigation={navigation}
      preferences={preferences}
      document={{
        title: "Contract test document",
        saveStatus: { state: "saving" },
        focusEditor: () => editor.current?.focus({ preventScroll: true }),
      }}
    >
      <div style={{ minHeight: 1600, paddingTop: 32 }}>
        <label>
          Document body
          <textarea
            ref={editor}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            style={{
              display: "block",
              width: "100%",
              height: 320,
              resize: "none",
            }}
          />
        </label>
      </div>
    </DesktopShell>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocumentTestHost />
  </StrictMode>,
);
