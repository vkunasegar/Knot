// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { NavigationController } from "./NavigationController";
import { destinations } from "./routes";

let stop: (() => void) | undefined;
afterEach(() => { stop?.(); window.history.replaceState(null, "", "/"); });

function controller(hash = "") {
  window.history.replaceState(null, "", `/${hash}`);
  const navigation = new NavigationController(window);
  stop = navigation.start();
  return navigation;
}

describe("NavigationController", () => {
  it("supports every destination and ignores duplicate navigation", () => {
    const navigation = controller();
    expect(navigation.getSnapshot()).toEqual({ destination: "home", canGoBack: false, canGoForward: false });
    for (const { id } of destinations) {
      navigation.navigate(id);
      expect(navigation.getSnapshot().destination).toBe(id);
      expect(location.hash).toBe(`#/${id}`);
    }
    const snapshot = navigation.getSnapshot();
    navigation.navigate("settings");
    expect(navigation.getSnapshot()).toBe(snapshot);
  });

  it("accepts direct links and normalizes unknown routes", () => {
    expect(controller("#/collections").getSnapshot().destination).toBe("collections");
    stop?.();
    expect(controller("#/missing").getSnapshot().destination).toBe("home");
    expect(location.hash).toBe("#/home");
  });

  it("bounds history and truncates forward entries after a new destination", async () => {
    const navigation = controller();
    navigation.back();
    expect(navigation.getSnapshot().destination).toBe("home");
    navigation.navigate("notes");
    navigation.navigate("threads");
    navigation.back();
    await waitFor(() => expect(navigation.getSnapshot()).toMatchObject({ destination: "notes", canGoForward: true }));
    navigation.forward();
    await waitFor(() => expect(navigation.getSnapshot()).toMatchObject({ destination: "threads", canGoForward: false }));
    navigation.back();
    await waitFor(() => expect(navigation.getSnapshot().destination).toBe("notes"));
    navigation.navigate("archive");
    expect(navigation.getSnapshot().canGoForward).toBe(false);
    navigation.back();
    await waitFor(() => expect(navigation.getSnapshot().destination).toBe("notes"));
    navigation.back();
    await waitFor(() => expect(navigation.getSnapshot().canGoBack).toBe(false));
  });

  it("adopts external hash navigation once and unsubscribes cleanly", async () => {
    const navigation = controller();
    let notifications = 0;
    const unsubscribe = navigation.subscribe(() => { notifications++; });
    location.hash = "#/favorites";
    await waitFor(() => expect(navigation.getSnapshot().destination).toBe("favorites"));
    expect(notifications).toBe(1);
    unsubscribe();
    navigation.navigate("settings");
    expect(notifications).toBe(1);
  });
});
