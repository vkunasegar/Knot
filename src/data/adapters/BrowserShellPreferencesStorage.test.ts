import { expect, it } from "vitest";
import { BrowserShellPreferencesStorage } from "./BrowserShellPreferencesStorage";

it("defers storage access so policy errors reach the service recovery boundary", () => {
  const adapter = new BrowserShellPreferencesStorage(() => {
    throw new Error("access denied");
  });
  expect(() => adapter.read()).toThrow("access denied");
  expect(() => adapter.write("value")).toThrow("access denied");
});
