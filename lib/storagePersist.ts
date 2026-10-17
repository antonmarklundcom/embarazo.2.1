// Ask the browser to keep this origin's storage (IndexedDB holds the whole
// diary) instead of evicting it under storage pressure. Android Chrome decides
// silently; there is no prompt text for us to show.
//
// Returns:
//   true  — the origin is persistent (already was, or the browser granted it)
//   false — the browser declined
//   null  — the API is unavailable here, or it threw; nothing is known
//
// Never throws: callers may fire-and-forget it.
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (typeof navigator === "undefined") return null;
    const storage = navigator.storage;
    if (!storage || typeof storage.persist !== "function" || typeof storage.persisted !== "function") {
      return null;
    }
    // Ask first: once granted, `persist()` is a no-op, and a repeat call on a
    // persisted origin should not look like a new request to the browser.
    if (await storage.persisted()) return true;
    return Boolean(await storage.persist());
  } catch {
    return null;
  }
}
