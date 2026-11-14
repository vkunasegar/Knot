import { describe, expect, it } from "vitest";
import type { ShellPreferencesStorage } from "../../data/contracts";
import { ShellPreferencesService } from "./ShellPreferencesService";

class MemoryStorage implements ShellPreferencesStorage {
  constructor(public value: string | null = null) {}
  read() {
    return this.value;
  }
  write(value: string) {
    this.value = value;
  }
}

describe("ShellPreferencesService", () => {
  it("restores both preferences across service instances", () => {
    const storage = new MemoryStorage();
    const service = new ShellPreferencesService(storage);
    expect(service.getSnapshot()).toEqual({
      sidebarCollapsed: false,
      contextVisible: true,
      warning: null,
    });
    let notifications = 0;
    const unsubscribe = service.subscribe(() => {
      notifications++;
    });
    service.update({ sidebarCollapsed: true });
    service.update({ contextVisible: false });
    unsubscribe();
    service.update({ contextVisible: true });
    expect(notifications).toBe(2);
    expect(new ShellPreferencesService(storage).getSnapshot()).toEqual({
      sidebarCollapsed: true,
      contextVisible: true,
      warning: null,
    });
  });

  it.each([
    "{",
    "null",
    "[]",
    '{"version":2}',
    '{"version":1,"sidebarCollapsed":"false","contextVisible":true}',
  ])("falls back safely for invalid persisted data: %s", (raw) => {
    expect(
      new ShellPreferencesService(new MemoryStorage(raw)).getSnapshot(),
    ).toMatchObject({
      sidebarCollapsed: false,
      contextVisible: true,
      warning: expect.any(String),
    });
  });

  it("keeps session changes and allows retry after a storage failure", () => {
    const storage = new MemoryStorage();
    let blocked = true;
    storage.read = () => {
      throw new Error("denied");
    };
    storage.write = (value) => {
      if (blocked) throw new Error("quota");
      storage.value = value;
    };
    const service = new ShellPreferencesService(storage);
    expect(service.getSnapshot().warning).not.toBeNull();
    service.update({ contextVisible: false });
    expect(service.getSnapshot()).toMatchObject({
      contextVisible: false,
      warning: expect.any(String),
    });
    blocked = false;
    service.update({ sidebarCollapsed: true });
    expect(service.getSnapshot().warning).toBeNull();
    expect(JSON.parse(storage.value!)).toMatchObject({
      version: 1,
      contextVisible: false,
      sidebarCollapsed: true,
    });
  });
});
