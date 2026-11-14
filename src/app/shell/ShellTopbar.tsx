import type { Ref } from "react";
import { Button, SaveStatus, Tooltip } from "../../shared/ui";
import type {
  NavigationController,
  NavigationSnapshot,
} from "./NavigationController";
import type { ShellDocument } from "./ShellDocument";
import type { destinations } from "./routes";
import { ShellIcon } from "./ShellIcon";

interface ShellTopbarProps {
  navigation: NavigationController;
  route: NavigationSnapshot;
  destination: (typeof destinations)[number];
  document?: ShellDocument;
  hidden: boolean;
  contextVisible: boolean;
  panelToggleRef: Ref<HTMLButtonElement>;
  onToggleContext: () => void;
  onOpenPalette: () => void;
  onEnterFocus: () => void;
}

/** Presentation-only toolbar. Persistence state is supplied by the active document. */
export function ShellTopbar({
  navigation,
  route,
  destination,
  document,
  hidden,
  contextVisible,
  panelToggleRef,
  onToggleContext,
  onOpenPalette,
  onEnterFocus,
}: ShellTopbarProps) {
  return (
    <header className="shell-topbar" hidden={hidden}>
      <div className="shell-history" aria-label="Navigation history">
        <Tooltip content="Back (Alt + ←)">
          <Button
            variant="quiet"
            className="shell-icon-button"
            aria-label="Go back"
            disabled={!route.canGoBack}
            onClick={navigation.back}
          >
            <ShellIcon name="back" />
          </Button>
        </Tooltip>
        <Tooltip content="Forward (Alt + →)">
          <Button
            variant="quiet"
            className="shell-icon-button"
            aria-label="Go forward"
            disabled={!route.canGoForward}
            onClick={navigation.forward}
          >
            <ShellIcon name="forward" />
          </Button>
        </Tooltip>
      </div>
      <nav className="shell-breadcrumbs" aria-label="Breadcrumb">
        <a
          href="#/home"
          onClick={(event) => {
            event.preventDefault();
            navigation.navigate("home");
          }}
        >
          Workspace
        </a>
        <span aria-hidden="true">/</span>
        <span aria-current={document ? undefined : "page"}>
          {destination.label}
        </span>
        {document && (
          <>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{document.title}</span>
          </>
        )}
      </nav>
      <div className="shell-topbar__actions">
        <SaveStatus
          {...(document?.saveStatus ?? {
            state: "idle",
            detail: "No document open",
          })}
        />
        <Tooltip content="Search workspace (Ctrl / ⌘ + K)">
          <Button
            variant="quiet"
            className="shell-icon-button"
            aria-label="Search workspace"
            aria-haspopup="dialog"
            onClick={onOpenPalette}
          >
            <ShellIcon name="search" />
          </Button>
        </Tooltip>
        {document && (
          <Tooltip content="Enter Focus Mode">
            <Button
              variant="quiet"
              className="shell-icon-button"
              aria-label="Enter Focus Mode"
              onClick={onEnterFocus}
            >
              <ShellIcon name="focus" />
            </Button>
          </Tooltip>
        )}
        <Button
          ref={panelToggleRef}
          variant="quiet"
          className="shell-icon-button"
          aria-label={
            contextVisible ? "Hide context panel" : "Show context panel"
          }
          aria-expanded={contextVisible}
          aria-controls="shell-context"
          onClick={onToggleContext}
        >
          <ShellIcon name="context" />
        </Button>
      </div>
    </header>
  );
}
