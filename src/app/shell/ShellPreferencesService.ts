import type { ShellPreferencesStorage } from "../../data/contracts";

export interface ShellPreferences {
  readonly sidebarCollapsed: boolean;
  readonly contextVisible: boolean;
}

export interface PreferencesSnapshot extends ShellPreferences {
  readonly warning: string | null;
}

const defaults: ShellPreferences = {
  sidebarCollapsed: false,
  contextVisible: true,
};

/** UI preferences are independent of document data and durable-save status. */
export class ShellPreferencesService {
  private readonly listeners = new Set<() => void>();
  private snapshot: PreferencesSnapshot;

  constructor(private readonly storage: ShellPreferencesStorage) {
    this.snapshot = this.load();
  }

  getSnapshot = (): PreferencesSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  update(change: Partial<ShellPreferences>): void {
    const preferences = {
      sidebarCollapsed:
        change.sidebarCollapsed ?? this.snapshot.sidebarCollapsed,
      contextVisible: change.contextVisible ?? this.snapshot.contextVisible,
    };
    let warning: string | null = null;
    try {
      this.storage.write(JSON.stringify({ version: 1, ...preferences }));
    } catch {
      warning =
        "Workspace preferences could not be saved. Your layout still works for this session.";
    }
    this.snapshot = Object.freeze({ ...preferences, warning });
    this.listeners.forEach((listener) => listener());
  }

  private load(): PreferencesSnapshot {
    try {
      const raw = this.storage.read();
      if (raw === null) return Object.freeze({ ...defaults, warning: null });
      const value: unknown = JSON.parse(raw);
      if (
        typeof value !== "object" ||
        value === null ||
        !("version" in value) ||
        value.version !== 1 ||
        !("sidebarCollapsed" in value) ||
        typeof value.sidebarCollapsed !== "boolean" ||
        !("contextVisible" in value) ||
        typeof value.contextVisible !== "boolean"
      ) {
        throw new Error("Unsupported workspace preferences");
      }
      return Object.freeze({
        sidebarCollapsed: value.sidebarCollapsed,
        contextVisible: value.contextVisible,
        warning: null,
      });
    } catch {
      return Object.freeze({
        ...defaults,
        warning:
          "Workspace preferences could not be loaded. The default layout is in use.",
      });
    }
  }
}
