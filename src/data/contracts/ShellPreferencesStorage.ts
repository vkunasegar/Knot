/** Stores UI preferences only. Document persistence belongs to native repositories. */
export interface ShellPreferencesStorage {
  read(): string | null;
  write(value: string): void;
}
