import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button, KnotMotif, SaveStatus, Tooltip } from "../../shared/ui";
import { NavigationController } from "./NavigationController";
import { ShellPreferencesService } from "./ShellPreferencesService";
import { destinations, type Destination } from "./routes";
import { ShellIcon } from "./ShellIcon";
import "./DesktopShell.css";

export interface DesktopShellProps {
  navigation: NavigationController;
  preferences: ShellPreferencesService;
  /** A stable content slot: panel/layout changes must never remount a workflow. */
  children?: ReactNode;
  context?: ReactNode;
}

function useCompactSidebar() {
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 1199px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1199px)");
    const change = () => setCompact(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return compact;
}

/** Shell owns presentation state only; workflow and document state stay in their slots. */
export function DesktopShell({ navigation, preferences, children, context }: DesktopShellProps) {
  const route = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot);
  const layout = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot);
  const compact = useCompactSidebar();
  const collapsed = compact || layout.sidebarCollapsed;
  const destination = destinations.find(({ id }) => id === route.destination)!;
  const heading = useRef<HTMLHeadingElement>(null);
  const panelToggle = useRef<HTMLButtonElement>(null);
  const previousRoute = useRef(route.destination);

  useEffect(() => navigation.start(), [navigation]);
  useEffect(() => {
    if (previousRoute.current !== route.destination) {
      previousRoute.current = route.destination;
      heading.current?.focus();
    }
  }, [route.destination]);

  const navigate = (id: Destination) => navigation.navigate(id);
  const closePanel = () => {
    panelToggle.current?.focus();
    preferences.update({ contextVisible: false });
  };

  function navItem(item: typeof destinations[number]) {
    return <Tooltip key={item.id} content={item.label}>
      <a href={`#/${item.id}`} className="shell-nav__link" aria-label={item.label}
        aria-current={route.destination === item.id ? "page" : undefined}
        onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); navigate(item.id);
        }}>
        <ShellIcon name={item.id} /><span className="shell-nav__label">{item.label}</span>
      </a>
    </Tooltip>;
  }

  return <div className="desktop-shell" data-sidebar-collapsed={collapsed} data-context-visible={layout.contextVisible}>
    <a className="shell-skip" href="#shell-main" onClick={(event) => { event.preventDefault(); heading.current?.focus(); }}>Skip to content</a>
    <aside className="shell-sidebar" aria-label="Workspace sidebar">
      <a className="shell-brand" href="#/home" aria-label="KNOT Home" onClick={(event) => { event.preventDefault(); navigate("home"); }}>
        <KnotMotif className="shell-brand__mark" /><span className="shell-nav__label">KNOT</span>
      </a>
      <nav id="workspace-navigation" className="shell-nav" aria-label="Main navigation">
        <div className="shell-nav__primary">{destinations.filter(({ id }) => id !== "settings").map(navItem)}</div>
        <div className="shell-nav__bottom">{navItem(destinations[6])}</div>
      </nav>
      <div className="shell-sidebar__footer">
        <Tooltip content={compact ? "Sidebar adapts to this window size" : collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <Button variant="quiet" className="shell-icon-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed} aria-controls="workspace-navigation" disabled={compact}
            onClick={() => preferences.update({ sidebarCollapsed: !layout.sidebarCollapsed })}>
            <ShellIcon name="sidebar" />
          </Button>
        </Tooltip>
        <span className="shell-nav__label shell-local-label">Local workspace</span>
      </div>
    </aside>
    <div className="shell-workspace">
      <header className="shell-topbar">
        <div className="shell-history" aria-label="Navigation history">
          <Tooltip content="Back (Alt + ←)"><Button variant="quiet" className="shell-icon-button" aria-label="Go back" disabled={!route.canGoBack} onClick={navigation.back}><ShellIcon name="back" /></Button></Tooltip>
          <Tooltip content="Forward (Alt + →)"><Button variant="quiet" className="shell-icon-button" aria-label="Go forward" disabled={!route.canGoForward} onClick={navigation.forward}><ShellIcon name="forward" /></Button></Tooltip>
        </div>
        <nav className="shell-breadcrumbs" aria-label="Breadcrumb"><a href="#/home" onClick={(event) => { event.preventDefault(); navigate("home"); }}>Workspace</a><span aria-hidden="true">/</span><span aria-current="page">{destination.label}</span></nav>
        <div className="shell-topbar__actions">
          <SaveStatus state="idle" detail="No document open" />
          <Button ref={panelToggle} variant="quiet" className="shell-icon-button" aria-label={layout.contextVisible ? "Hide context panel" : "Show context panel"} aria-expanded={layout.contextVisible} aria-controls="shell-context" onClick={() => preferences.update({ contextVisible: !layout.contextVisible })}><ShellIcon name="context" /></Button>
        </div>
      </header>
      {layout.warning && <div className="shell-warning" role="status">{layout.warning}</div>}
      <div className="shell-body">
        <main id="shell-main" className="shell-main">
          <div className="shell-content">
            <p className="shell-eyebrow">YOUR WORKSPACE</p>
            <h1 ref={heading} tabIndex={-1}>{destination.label}</h1>
            {children ?? <>
              <p className="shell-intro">{destination.description}</p>
              <section className="shell-entry" aria-label={`${destination.label} overview`}>
                <div className="shell-entry__icon"><ShellIcon name={destination.id} /></div>
                <h2>{destination.description}</h2><p>{destination.detail}</p>
                {route.destination === "home" && <Button onClick={() => navigate("notes")}>Explore your workspace <span aria-hidden="true">→</span></Button>}
                {route.destination === "settings" && <div className="shell-settings">
                  <label><input type="checkbox" checked={layout.sidebarCollapsed} onChange={(event) => preferences.update({ sidebarCollapsed: event.target.checked })} /> Compact sidebar <span>(used in wide windows)</span></label>
                  <label><input type="checkbox" checked={layout.contextVisible} onChange={(event) => preferences.update({ contextVisible: event.target.checked })} /> Show context panel</label>
                </div>}
              </section>
              <p className="shell-footnote">Every thought is a thread.<br />Every connection creates meaning.</p>
            </>}
          </div>
        </main>
        <aside id="shell-context" className="shell-context" aria-label="Context panel" hidden={!layout.contextVisible}>
          <div className="shell-context__heading"><h2>Context</h2><Button variant="quiet" size="sm" aria-label="Close context panel" onClick={closePanel}>×</Button></div>
          {context ?? <><p className="shell-eyebrow">{destination.label}</p><h3>A little room for perspective.</h3><p>{destination.detail}</p><div className="shell-context__hint"><ShellIcon name="context" /><p>This panel follows your workspace. Hide it whenever you need more room.</p></div></>}
        </aside>
      </div>
    </div>
  </div>;
}
