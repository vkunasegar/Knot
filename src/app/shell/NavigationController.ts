import { parseDestination, type Destination } from "./routes";

export interface NavigationSnapshot {
  readonly destination: Destination;
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
  private queuedDestination: Destination | null = null;

  constructor(private readonly browser: Window) {
    this.snapshot = this.makeSnapshot(parseDestination(browser.location.hash));
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
      this.replace(this.snapshot.destination);
      this.browser.addEventListener("popstate", this.onLocationChange);
      this.browser.addEventListener("hashchange", this.onLocationChange);
    }
    return () => {
      this.listening = false;
      this.browser.removeEventListener("popstate", this.onLocationChange);
      this.browser.removeEventListener("hashchange", this.onLocationChange);
    };
  }

  navigate(destination: Destination): void {
    if (this.traversalPending) {
      this.queuedDestination = destination;
      return;
    }
    if (destination === this.snapshot.destination) return;
    this.index += 1;
    this.lastIndex = this.index;
    this.browser.history.pushState(this.historyState(), "", `#/${destination}`);
    this.publish(destination);
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

  private historyState() {
    return { knotNavigation: this.session, index: this.index };
  }

  private replace(destination: Destination): void {
    this.browser.history.replaceState(
      this.historyState(),
      "",
      `#/${destination}`,
    );
  }

  private onLocationChange = (): void => {
    // Browser traversal is asynchronous. Serialize it so a rapid double Back
    // cannot pass the session boundary; apply the latest requested route after
    // the browser acknowledges its position, instead of racing pushState.
    this.traversalPending = false;
    const state: unknown = this.browser.history.state;
    const destination = parseDestination(this.browser.location.hash);
    if (
      typeof state === "object" &&
      state !== null &&
      "knotNavigation" in state &&
      state.knotNavigation === this.session &&
      "index" in state &&
      Number.isInteger(state.index) &&
      typeof state.index === "number" &&
      state.index >= 0 &&
      state.index <= this.lastIndex
    ) {
      this.index = state.index;
    } else {
      // An external hash edit has already inserted a browser entry. Adopt it
      // without pushing another entry or trusting foreign history metadata.
      this.index += 1;
      this.lastIndex = this.index;
    }
    this.replace(destination);
    this.publish(destination);
    if (this.queuedDestination !== null) {
      const queued = this.queuedDestination;
      this.queuedDestination = null;
      this.navigate(queued);
    }
  };

  private makeSnapshot(destination: Destination): NavigationSnapshot {
    return Object.freeze({
      destination,
      canGoBack: this.index > 0,
      canGoForward: this.index < this.lastIndex,
    });
  }

  private publish(destination: Destination): void {
    const next = this.makeSnapshot(destination);
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
