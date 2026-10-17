import "server-only";

import { FLAG_DEFINITIONS, FLAG_KEYS, type FlagKey, type FlagValues } from "@/lib/flags/keys";
import { pushHealth, type PushHealthStore } from "./pushHealth";

// The numbers at the top of `/admin`: what is deployed, whether notifications
// are going out, and which flags are on. Read-only and counts only, in the
// same spirit as `/admin/avisos`: a revision, a timestamp, two counts and the
// flag names with their on/off state. No account, device or message content
// ever passes through here.
//
// Pure over its inputs (the push store, the flag reader, the revision) so the
// page stays thin and the shape is testable without a database.

export type PushSummary =
  /** No database in this deployment: nothing to count. */
  | { kind: "no-database" }
  /** The tables could not be read. The page says so instead of crashing. */
  | { kind: "unavailable" }
  | {
      kind: "ok";
      /** Epoch ms of the last notification the dispatcher sent, or null. */
      lastSentAt: number | null;
      /** Unsent reminders whose due time is already in the past. */
      overdue: number;
      /** Of those, due more than an hour ago (the dispatcher is stuck). */
      overdueOverHour: number;
    };

export interface FlagState {
  key: FlagKey;
  on: boolean;
  /** Whether the value differs from the flag's default. */
  changed: boolean;
}

export interface AdminSummary {
  /** First seven characters of the deployed git SHA, or "unknown". */
  revision: string;
  push: PushSummary;
  flags: FlagState[];
  /** False when flags are the defaults because there is no database. */
  flagsFromDatabase: boolean;
}

export async function loadAdminSummary(input: {
  revision: string;
  /** `null` when the deployment has no database. */
  pushStore: PushHealthStore | null;
  readFlags: () => Promise<FlagValues>;
  flagsFromDatabase: boolean;
  now?: Date;
}): Promise<AdminSummary> {
  let push: PushSummary = { kind: "no-database" };
  if (input.pushStore) {
    try {
      const health = await pushHealth(input.pushStore, input.now);
      push = {
        kind: "ok",
        lastSentAt: health.reminders.lastSentAt,
        overdue: health.reminders.dueUnsent,
        overdueOverHour: health.reminders.dueUnsentOverHour,
      };
    } catch {
      push = { kind: "unavailable" };
    }
  }

  const values = await input.readFlags();
  const flags = FLAG_KEYS.map((key) => ({
    key,
    on: values[key],
    changed: values[key] !== FLAG_DEFINITIONS[key].default,
  }));

  return {
    revision: input.revision,
    push,
    flags,
    flagsFromDatabase: input.flagsFromDatabase,
  };
}
