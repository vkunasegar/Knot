import { parseRoute, type Destination, type WorkspaceRoute } from "./routes";
import type { NoteId } from "../../shared/domain";

export interface NavigationSnapshot extends WorkspaceRoute {
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
}

/**
 * Owns a bounded history inside this application session. Browser traversal and
 * hash links enter through the same adapter; back never leaves the application.
 * A fresh page establishes a fresh history boundary, even after a reload.
 */
export class NavigationController {
  private readonly listeners = new Set<() => void>();
  private readonly session = crypto.randomUUID();
  private index = 0;
  private lastIndex = 0;
  private snapshot: NavigationSnapshot;
  private listening = false;
  private traversalPending = false;
  private queuedDestination: WorkspaceRoute | null = null;

  constructor(private readonly browser: Window) {
    this.snapshot = this.makeSnapshot(parseRoute(browser.location.hash));
  }

  getSnapshot = (): NavigationSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Idempotent lifecycle supports React Strict Mode without duplicate handlers. */
  start(): () => void {
    if (!this.listening) {
      this.listening = true;
      this.replace(this.snapshot);
      this.browser.addEventListener("popstate", this.onLocationChange);
      this.browser.addEventListener("hashchange", this.onLocationChange);
    }
    return () => {
      this.listening = false;
      this.browser.removeEventListener("popstate", this.onLocationChange);
      this.browser.removeEventListener("hashchange", this.onLocationChange);
    };
  }

  navigate(
    destination: Destination,
    options: { noteId?: NoteId; trash?: boolean } = {},
  ): void {
    const route = parseRoute(
      `#/${destination}/${options.trash ? "trash" : (options.noteId ?? "")}`,
    );
    this.navigateRoute(route);
  }

  private navigateRoute(route: WorkspaceRoute): void {
    if (this.traversalPending) {
      this.queuedDestination = route;
      return;
    }
    if (this.toHash(route) === this.toHash(this.snapshot)) return;
    this.index += 1;
    this.lastIndex = this.index;
    this.browser.history.pushState(this.historyState(), "", this.toHash(route));
    this.publish(route);
  }

  back = (): void => {
    if (this.snapshot.canGoBack && !this.traversalPending) {
      this.traversalPending = true;
      this.browser.history.back();
    }
  };
  forward = (): void => {
    if (this.snapshot.canGoForward && !this.traversalPending) {
      this.traversalPending = true;
      this.browser.history.forward();
    }
  };

  private toHash(route: WorkspaceRoute): string {
    return `#/${route.destination}${route.trash ? "/trash" : route.noteId ? `/${route.noteId}` : ""}`;
  }

  private historyState() {
    return { knotNavigation: this.session, index: this.index };
  }

  private isOwnHistoryState(
    state: unknown,
  ): state is { knotNavigation: string; index: number } {
    return (
      typeof state === "object" &&
      state !== null &&
      "knotNavigation" in state &&
      state.knotNavigation === this.session &&
      "index" in state &&
      Number.isInteger(state.index) &&
      typeof state.index === "number" &&
      state.index >= 0 &&
      state.index <= this.lastIndex
    );
  }

  private replace(route: WorkspaceRoute): void {
    this.browser.history.replaceState(
      this.historyState(),
      "",
      this.toHash(route),
    );
  }

  private onLocationChange = (event?: Event): void => {
    const state: unknown = this.browser.history.state;
    // Chromium queues hashchange in a later task after popstate. If the next
    // traversal starts in between, ignore the stale hashchange so replaceState
    // cannot cancel the in-flight history traversal or reset traversalPending.
    if (
      event?.type === "hashchange" &&
      this.isOwnHistoryState(state) &&
      state.index === this.index &&
      this.browser.location.hash === this.toHash(this.snapshot)
    ) {
      return;
    }
    // Browser traversal is asynchronous. Serialize it so a rapid double Back
    // cannot pass the session boundary; apply the latest requested route after
    // the browser acknowledges its position, instead of racing pushState.
    this.traversalPending = false;
    const route = parseRoute(this.browser.location.hash);
    if (this.isOwnHistoryState(state)) {
      this.index = state.index;
    } else {
      // An external hash edit has already inserted a browser entry. Adopt it
      // without pushing another entry or trusting foreign history metadata.
      this.index += 1;
      this.lastIndex = this.index;
    }
    this.replace(route);
    this.publish(route);
    if (this.queuedDestination !== null) {
      const queued = this.queuedDestination;
      this.queuedDestination = null;
      this.navigateRoute(queued);
    }
  };

  private makeSnapshot(route: WorkspaceRoute): NavigationSnapshot {
    return Object.freeze({
      ...route,
      canGoBack: this.index > 0,
      canGoForward: this.index < this.lastIndex,
    });
  }

  private publish(route: WorkspaceRoute): void {
    const next = this.makeSnapshot(route);
    if (
      Object.keys(next).every(
        (key) =>
          next[key as keyof NavigationSnapshot] ===
          this.snapshot[key as keyof NavigationSnapshot],
      )
    )
      return;
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}
