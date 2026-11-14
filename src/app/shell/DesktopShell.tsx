import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Button } from "../../shared/ui";
import { NavigationController } from "./NavigationController";
import { ShellPreferencesService } from "./ShellPreferencesService";
import { destinations, type Destination } from "./routes";
import { ShellIcon } from "./ShellIcon";
import { SearchPalette, type ShellAction } from "./SearchPalette";
import type { ShellDocument } from "./ShellDocument";
import { ShellTopbar } from "./ShellTopbar";
import { ShellSidebar } from "./ShellSidebar";
import { WorkspaceOverview } from "./WorkspaceOverview";
import "./DesktopShell.css";

export interface DesktopShellProps {
  navigation: NavigationController;
  preferences: ShellPreferencesService;
  /** A stable content slot: panel/layout changes must never remount a workflow. */
  children?: ReactNode;
  context?: ReactNode;
  document?: ShellDocument;
}

function useCompactSidebar() {
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 1199px)").matches,
  );
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
export function DesktopShell({
  navigation,
  preferences,
  children,
  context,
  document: workspaceDocument,
}: DesktopShellProps) {
  const route = useSyncExternalStore(
    navigation.subscribe,
    navigation.getSnapshot,
  );
  const layout = useSyncExternalStore(
    preferences.subscribe,
    preferences.getSnapshot,
  );
  const compact = useCompactSidebar();
  const collapsed = compact || layout.sidebarCollapsed;
  const destination = destinations.find(({ id }) => id === route.destination)!;
  const heading = useRef<HTMLHeadingElement>(null);
  const panelToggle = useRef<HTMLButtonElement>(null);
  const previousRoute = useRef(route.destination);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusRequested, setFocusRequested] = useState(false);
  const focusMode = Boolean(workspaceDocument) && focusRequested;
  const paletteOrigin = useRef<HTMLElement | null>(null);
  const pendingAction = useRef<ShellAction | null>(null);
  const contextPanel = useRef<HTMLElement>(null);
  const focusCallback = useRef(workspaceDocument?.focusEditor);
  focusCallback.current = workspaceDocument?.focusEditor;

  const openPalette = () => {
    paletteOrigin.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPaletteOpen(true);
  };

  const closePalette = () => {
    setPaletteOpen(false);
    // Closing the native dialog restores its original focus first. Schedule
    // shell actions afterward, otherwise that restoration can steal route focus.
  };

  useEffect(() => {
    if (paletteOpen) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) action.run();
    else paletteOrigin.current?.focus({ preventScroll: true });
    paletteOrigin.current = null;
  }, [paletteOpen]);

  useEffect(() => {
    focusCallback.current?.();
  }, [focusMode]);

  useEffect(() => {
    if (!workspaceDocument) setFocusRequested(false);
  }, [workspaceDocument]);

  useEffect(() => {
    if (
      !layout.contextVisible &&
      contextPanel.current?.contains(document.activeElement)
    )
      panelToggle.current?.focus();
  }, [layout.contextVisible]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        if (!paletteOpen) openPalette();
      } else if (
        !paletteOpen &&
        !focusMode &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        if (event.key === "ArrowLeft") navigation.back();
        else navigation.forward();
      } else if (focusMode && !paletteOpen && event.key === "Escape") {
        // A nested modal or editor can consume Escape before the shell sees it.
        const activeDialog = document.querySelector("dialog[open]");
        if (!activeDialog) {
          event.preventDefault();
          setFocusRequested(false);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigation, paletteOpen, focusMode]);

  useEffect(() => navigation.start(), [navigation]);
  useEffect(() => {
    if (previousRoute.current !== route.destination) {
      previousRoute.current = route.destination;
      setFocusRequested(false);
      heading.current?.focus();
    }
  }, [route.destination]);

  const navigate = (id: Destination) => navigation.navigate(id);
  const closePanel = () => {
    panelToggle.current?.focus();
    preferences.update({ contextVisible: false });
  };

  const availableActions: ShellAction[] = [
    ...destinations.map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.id,
      run: () => {
        setFocusRequested(false);
        navigation.navigate(item.id);
        heading.current?.focus();
      },
    })),
    {
      id: "toggle-sidebar",
      label: layout.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar",
      icon: "sidebar",
      run: () =>
        preferences.update({ sidebarCollapsed: !layout.sidebarCollapsed }),
    },
    {
      id: "toggle-context",
      label: layout.contextVisible
        ? "Hide context panel"
        : "Show context panel",
      icon: "context",
      run: () => preferences.update({ contextVisible: !layout.contextVisible }),
    },
    ...(workspaceDocument
      ? [
          {
            id: "toggle-focus",
            label: focusMode ? "Exit Focus Mode" : "Enter Focus Mode",
            icon: "focus" as const,
            run: () => setFocusRequested(!focusMode),
          },
        ]
      : []),
  ];
  const actions = availableActions.filter(
    (action) => !compact || action.id !== "toggle-sidebar",
  );

  return (
    <div
      className="desktop-shell"
      data-sidebar-collapsed={collapsed}
      data-context-visible={layout.contextVisible}
      data-focus-mode={focusMode}
    >
      <SearchPalette
        open={paletteOpen}
        actions={actions}
        onClose={closePalette}
        onSelect={(action) => {
          pendingAction.current = action;
          closePalette();
        }}
      />
      {focusMode && (
        <Button
          className="shell-focus-exit"
          variant="quiet"
          onClick={() => setFocusRequested(false)}
        >
          <ShellIcon name="exit" /> Exit Focus Mode
        </Button>
      )}
      <a
        className="shell-skip"
        href="#shell-main"
        onClick={(event) => {
          event.preventDefault();
          heading.current?.focus();
        }}
      >
        Skip to content
      </a>
      <ShellSidebar
        destination={route.destination}
        collapsed={collapsed}
        compact={compact}
        hidden={focusMode}
        navigate={navigate}
        onToggle={() =>
          preferences.update({ sidebarCollapsed: !layout.sidebarCollapsed })
        }
      />
      <div className="shell-workspace">
        <ShellTopbar
          navigation={navigation}
          route={route}
          destination={destination}
          document={workspaceDocument}
          hidden={focusMode}
          contextVisible={layout.contextVisible}
          panelToggleRef={panelToggle}
          onToggleContext={() =>
            preferences.update({ contextVisible: !layout.contextVisible })
          }
          onOpenPalette={openPalette}
          onEnterFocus={() => setFocusRequested(true)}
        />
        {layout.warning && (
          <div className="shell-warning" role="status">
            {layout.warning}
          </div>
        )}
        <div className="shell-body">
          <main id="shell-main" className="shell-main">
            <div className="shell-content">
              <p className="shell-eyebrow">YOUR WORKSPACE</p>
              <h1 ref={heading} tabIndex={-1}>
                {workspaceDocument?.title ?? destination.label}
              </h1>
              {children ?? (
                <WorkspaceOverview
                  destination={destination}
                  layout={layout}
                  navigate={navigate}
                  onPreferencesChange={(change) => preferences.update(change)}
                />
              )}
            </div>
          </main>
          <aside
            ref={contextPanel}
            id="shell-context"
            className="shell-context"
            aria-label="Context panel"
            hidden={!layout.contextVisible || focusMode}
          >
            <div className="shell-context__heading">
              <h2>Context</h2>
              <Button
                variant="quiet"
                size="sm"
                aria-label="Close context panel"
                onClick={closePanel}
              >
                ×
              </Button>
            </div>
            {context ?? (
              <>
                <p className="shell-eyebrow">{destination.label}</p>
                <h3>A little room for perspective.</h3>
                <p>{destination.detail}</p>
                <div className="shell-context__hint">
                  <ShellIcon name="context" />
                  <p>
                    This panel follows your workspace. Hide it whenever you need
                    more room.
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
