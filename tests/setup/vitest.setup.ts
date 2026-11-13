/**
 * Shared Vitest setup.
 *
 * Runs before every test file. Component tests opt into a DOM with the
 * `// @vitest-environment jsdom` docblock; Node-only tests (CLI checks, token
 * parsing) keep the default `node` environment. Everything DOM-specific below
 * is therefore guarded so it is a no-op in Node.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when test globals are enabled. This project
// imports `describe`/`it` explicitly, so unmount rendered trees here instead.
afterEach(() => {
  cleanup();
});

/*
 * jsdom implements <dialog> but not its modal API. This minimal stand-in
 * mirrors the observable state the Dialog component relies on: the `open`
 * attribute and the `close` event. It does not emulate the top layer, focus
 * trapping or the backdrop; those are covered by the Playwright tests in a
 * real browser engine.
 */
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute("open")) {
      return;
    }
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
