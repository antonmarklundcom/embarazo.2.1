// BUILD-PLAN A3 — "something changed locally".
//
// A three-line event bus exists so `lib/db.ts` can say a local write happened
// without importing the sync client, and the sync client can listen without
// importing Dexie's hooks. Both import this; neither imports the other, so
// there is no cycle and `lib/db.ts` stays usable in a build with sync switched
// off entirely.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Called by the Dexie hooks after a write that leaves a row dirty. */
export function notifyLocalChange(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken listener must never break the write that triggered it.
    }
  }
}

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
