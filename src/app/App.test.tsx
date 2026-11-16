// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { NotesController } from "../features/notes";
import {
  MemoryNoteRepository,
  sampleNote,
} from "../../tests/fixtures/MemoryNoteRepository";

beforeEach(() => {
  window.history.replaceState(null, "", "/#/notes");
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );
});
afterEach(() => vi.unstubAllGlobals());

function setup(repository = new MemoryNoteRepository([sampleNote()])) {
  const controller = new NotesController(repository);
  render(
    <StrictMode>
      <App notesController={controller} />
    </StrictMode>,
  );
  return { controller, repository, user: userEvent.setup() };
}

it("creates by keyboard, explicitly saves a Unicode title, and opens the same record after returning", async () => {
  const { user, repository } = setup(new MemoryNoteRepository());
  await screen.findByText("A little room for your next thought.");
  await user.keyboard("{Control>}n{/Control}");
  const title = await screen.findByRole("textbox", { name: "Title" });
  await waitFor(() => expect(title).toHaveFocus());
  await user.type(title, "Gedanken 🧶");
  expect(screen.getByText("Unsaved changes")).toBeVisible();
  await user.keyboard("{Enter}");
  await screen.findByRole("heading", { level: 1, name: "Gedanken 🧶" });
  expect(screen.getByText("Saved locally")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Back to All Notes" }));
  await user.click(screen.getByRole("link", { name: /Gedanken 🧶/ }));
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Gedanken 🧶",
  );
  expect(await repository.list()).toHaveLength(1);
});

it("keeps title drafts through navigation, failed saves, cancellation and Focus Mode", async () => {
  const { user, repository } = setup();
  await user.click(
    await screen.findByRole("link", {
      name: /A thought worth keeping.*Created/,
    }),
  );
  const title = screen.getByRole("textbox", { name: "Title" });
  await user.clear(title);
  await user.type(title, "Unsaved title");
  await user.click(screen.getByRole("link", { name: "Home" }));
  await user.click(screen.getByRole("link", { name: "All Notes" }));
  await user.click(
    await screen.findByRole("link", {
      name: /A thought worth keeping.*Created/,
    }),
  );
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Unsaved title",
  );
  repository.failNextWrite = "busy";
  await user.click(screen.getByRole("button", { name: "Save title" }));
  await screen.findByText(/Storage is busy/);
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Unsaved title",
  );
  expect(screen.queryByText("Saved locally")).not.toBeInTheDocument();
  const content = screen.getByRole("region", { name: "Note content" });
  await user.click(screen.getByRole("button", { name: "Enter Focus Mode" }));
  expect(content).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Exit Focus Mode" }));
  expect(screen.getByRole("region", { name: "Note content" })).toBe(content);
  await user.click(
    screen.getByRole("button", { name: "Cancel title changes" }),
  );
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
    sampleNote().title,
  );
});

it("supports favorite, archive, trash, restore and undo while preserving the document", async () => {
  const { user, repository } = setup();
  await user.click(
    await screen.findByRole("link", {
      name: /A thought worth keeping.*Created/,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Add favorite" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Remove favorite" }),
    ).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Archive note" }));
  await screen.findByText("Note archived.");
  await user.click(screen.getByRole("link", { name: "Favorites" }));
  expect(
    screen.queryByRole("link", { name: /A thought worth keeping.*Created/ }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Archive" }));
  await user.click(
    await screen.findByRole("link", {
      name: /A thought worth keeping.*Created/,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Move to trash" }));
  await screen.findByText("Note moved to trash.");
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute(
    "readonly",
  );
  await user.click(screen.getByRole("button", { name: "Back to Trash" }));
  await user.click(
    await screen.findByRole("link", {
      name: /A thought worth keeping.*Created/,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Restore note" }));
  await screen.findByText("Note restored from trash.");
  expect((await repository.get(sampleNote().id)).archivedAt).not.toBeNull();
  await user.click(screen.getByRole("button", { name: "Undo" }));
  await waitFor(async () =>
    expect((await repository.get(sampleNote().id)).deletedAt).not.toBeNull(),
  );
  expect((await repository.get(sampleNote().id)).body).toEqual(
    sampleNote().body,
  );
});

it("offers loading recovery and a clear missing-note state", async () => {
  const repository = new MemoryNoteRepository();
  repository.failNextRead = "unavailable";
  const { user } = setup(repository);
  await screen.findByRole("button", { name: "Try loading again" });
  expect(
    screen.queryByText("A little room for your next thought."),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try loading again" }));
  await screen.findByText("A little room for your next thought.");
  await act(async () => {
    location.hash = `#/notes/${sampleNote().id}`;
  });
  await screen.findByText("Note unavailable");
});

it("does not navigate away from a user's newer destination when a slow create finishes", async () => {
  const repository = new MemoryNoteRepository();
  const original = repository.create.bind(repository);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(repository, "create").mockImplementation(async (input) => {
    await gate;
    return original(input);
  });
  const { user } = setup(repository);
  await screen.findByText("A little room for your next thought.");
  await user.click(screen.getByRole("button", { name: "New note" }));
  await user.click(screen.getByRole("link", { name: "Home" }));
  await act(async () => {
    release();
    await gate;
  });
  await waitFor(async () => expect(await repository.list()).toHaveLength(1));
  expect(screen.getByRole("heading", { name: "Home", level: 1 })).toBeVisible();
  expect(location.hash).toBe("#/home");
});
