import { StoreError } from "../../shared/domain";
import type { StoreErrorCode } from "../../shared/domain";
import { assertJson } from "./storageDecoders";

/** Injected IPC seam keeps repositories testable without a WebView. */
export type NativeInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;
const nativeCodes: readonly StoreErrorCode[] = ["invalidInput", "notFound", "conflict", "busy", "unavailable",
  "incompatibleSchema", "corruptDatabase", "internal"];

/** Stateless transport; Rust owns database lifecycle and write serialization. */
export class NativeStoreClient {
  constructor(private readonly invoke: NativeInvoke) {}

  async execute<T>(request: Record<string, unknown>, decode: (response: unknown) => T): Promise<T> {
    assertJson(request);
    // Snapshot inputs before yielding: later edits must not mutate a queued save.
    const snapshot: unknown = JSON.parse(JSON.stringify(request));
    let response: unknown;
    try {
      response = await this.invoke("store_execute", { request: snapshot });
    } catch (error) {
      const code = typeof error === "string" && nativeCodes.includes(error as StoreErrorCode)
        ? error as StoreErrorCode : "unavailable";
      throw new StoreError(code);
    }
    try {
      assertJson(response);
      return decode(response);
    } catch {
      // A malformed acknowledgement must never be promoted to a saved state.
      throw new StoreError("invalidResponse");
    }
  }
}
