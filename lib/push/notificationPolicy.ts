import { normaliseCategories, type PushCategory } from "./categories";

// Non-sensitive device consent, separate from account/health records. The
// worker cannot read localStorage; an absent/unreadable policy permits only
// generic text, including the first push after an upgrade.
export const PUSH_POLICY_CACHE = "mibebe-push-policy-v1";
export const PUSH_POLICY_KEY = "/__push-category-policy";

let writeQueue = Promise.resolve();

export function writeNotificationPolicy(categories: readonly PushCategory[]): Promise<void> {
  // Rapid toggles must finish in the same order they were made: an earlier
  // slow cache write must never restore a category after a later opt-out.
  const selected = normaliseCategories(categories);
  writeQueue = writeQueue.then(() => storePolicy(selected));
  return writeQueue;
}

async function storePolicy(categories: readonly PushCategory[]): Promise<void> {
  try {
    const cache = await caches.open(PUSH_POLICY_CACHE);
    // Drop the old consent first: a quota failure writing new opt-outs must
    // leave no earlier, more permissive policy for a later worker to read.
    await cache.delete(PUSH_POLICY_KEY);
    await cache.put(PUSH_POLICY_KEY, new Response(JSON.stringify(normaliseCategories(categories))));
  } catch {
    // If consent cannot be persisted the worker falls back to generic copy.
  }
}

export async function readNotificationPolicy(): Promise<PushCategory[]> {
  try {
    const response = await (await caches.open(PUSH_POLICY_CACHE)).match(PUSH_POLICY_KEY);
    if (!response) return [];
    const values: unknown = await response.json();
    return Array.isArray(values) && values.every((value) => typeof value === "string")
      ? normaliseCategories(values)
      : [];
  } catch {
    return [];
  }
}
