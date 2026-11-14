import type { ShellPreferencesStorage } from "../contracts";

/** Acquire storage lazily: even accessing localStorage may throw under a WebView policy. */
export class BrowserShellPreferencesStorage implements ShellPreferencesStorage {
  private readonly key = "knot.shell.preferences.v1";

  constructor(private readonly storage: () => Storage = () => window.localStorage) {}

  read(): string | null {
    return this.storage().getItem(this.key);
  }

  write(value: string): void {
    this.storage().setItem(this.key, value);
  }
}
