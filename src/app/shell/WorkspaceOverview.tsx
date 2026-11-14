import { Button } from "../../shared/ui";
import type { destinations, Destination } from "./routes";
import type { ShellPreferences } from "./ShellPreferencesService";
import { ShellIcon } from "./ShellIcon";

interface WorkspaceOverviewProps {
  destination: (typeof destinations)[number];
  layout: ShellPreferences;
  navigate: (destination: Destination) => void;
  onPreferencesChange: (change: Partial<ShellPreferences>) => void;
}

/** Honest foundation views: no note records or empty-library counts are invented. */
export function WorkspaceOverview({
  destination,
  layout,
  navigate,
  onPreferencesChange,
}: WorkspaceOverviewProps) {
  return (
    <>
      <p className="shell-intro">{destination.description}</p>
      <section
        className="shell-entry"
        aria-label={`${destination.label} overview`}
      >
        <div className="shell-entry__icon">
          <ShellIcon name={destination.id} />
        </div>
        <h2>{destination.description}</h2>
        <p>{destination.detail}</p>
        {destination.id === "home" && (
          <Button onClick={() => navigate("notes")}>
            Explore your workspace <span aria-hidden="true">→</span>
          </Button>
        )}
        {destination.id === "settings" && (
          <div className="shell-settings">
            <label>
              <input
                type="checkbox"
                checked={layout.sidebarCollapsed}
                onChange={(event) =>
                  onPreferencesChange({
                    sidebarCollapsed: event.target.checked,
                  })
                }
              />{" "}
              Compact sidebar <span>(used in wide windows)</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={layout.contextVisible}
                onChange={(event) =>
                  onPreferencesChange({
                    contextVisible: event.target.checked,
                  })
                }
              />{" "}
              Show context panel
            </label>
          </div>
        )}
      </section>
      <p className="shell-footnote">
        Every thought is a thread.
        <br />
        Every connection creates meaning.
      </p>
    </>
  );
}
