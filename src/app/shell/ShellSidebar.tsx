import { Button, KnotMotif, Tooltip } from "../../shared/ui";
import { destinations, type Destination } from "./routes";
import { ShellIcon } from "./ShellIcon";

interface ShellSidebarProps {
  destination: Destination;
  collapsed: boolean;
  compact: boolean;
  hidden: boolean;
  navigate: (destination: Destination) => void;
  onToggle: () => void;
}

/** Named sidebar regions keep navigation semantics separate from shell orchestration. */
export function ShellSidebar({
  destination,
  collapsed,
  compact,
  hidden,
  navigate,
  onToggle,
}: ShellSidebarProps) {
  function navItem(item: (typeof destinations)[number]) {
    return (
      <Tooltip key={item.id} content={item.label}>
        <a
          href={`#/${item.id}`}
          className="shell-nav__link"
          aria-label={item.label}
          aria-current={destination === item.id ? "page" : undefined}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            navigate(item.id);
          }}
        >
          <ShellIcon name={item.id} />
          <span className="shell-nav__label">{item.label}</span>
        </a>
      </Tooltip>
    );
  }

  return (
    <aside
      className="shell-sidebar"
      aria-label="Workspace sidebar"
      hidden={hidden}
    >
      <a
        className="shell-brand"
        href="#/home"
        aria-label="KNOT Home"
        onClick={(event) => {
          event.preventDefault();
          navigate("home");
        }}
      >
        <KnotMotif className="shell-brand__mark" />
        <span className="shell-nav__label">KNOT</span>
      </a>
      <nav
        id="workspace-navigation"
        className="shell-nav"
        aria-label="Main navigation"
      >
        <div className="shell-nav__primary">
          {destinations.filter(({ id }) => id !== "settings").map(navItem)}
        </div>
        <div className="shell-nav__bottom">{navItem(destinations[6])}</div>
      </nav>
      <div className="shell-sidebar__footer">
        <Tooltip
          content={
            compact
              ? "Sidebar adapts to this window size"
              : collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
        >
          <Button
            variant="quiet"
            className="shell-icon-button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="workspace-navigation"
            disabled={compact}
            onClick={() => onToggle()}
          >
            <ShellIcon name="sidebar" />
          </Button>
        </Tooltip>
        <span className="shell-nav__label shell-local-label">
          Local workspace
        </span>
      </div>
    </aside>
  );
}
