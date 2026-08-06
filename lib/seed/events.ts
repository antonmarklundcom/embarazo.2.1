import type { EventItem } from "../types";
import { publishedOnly } from "./gate";
import { EventItemSchema, validateContentArray } from "../content/schemas";
import rawEvents from "./events.json";

// PLACEHOLDER curated events (build spec §7). Titles, venues, organizers and
// phone numbers are invented; +595 numbers are non-working examples. Events are
// CURATED seed data only — never user-posted. Replace with real, consented
// events before launch.
//
// G1 content ops: content lives in events.json (validated JSON) with FIXED
// epoch-millisecond `date` values. Dates used to be computed relative to
// `Date.now()` at module load (`inDays()`), which drifted with every deploy
// and can't be validated as "correct" by a schema — moving to a plain JSON
// number structurally removes that failure mode. For real data, keep using
// fixed epoch-millisecond timestamps.
const { valid, errors } = validateContentArray(
  "lib/seed/events.json",
  rawEvents as unknown[],
  EventItemSchema,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/events.json:\n${errors.join("\n")}`);
}

export const EVENTS: EventItem[] = valid;

// Placeholder gate (BUILD-PLAN Z1) — the app renders PUBLISHED_EVENTS, never
// EVENTS. Every entry above is currently invented, so the Eventos tab shows its
// empty state until real, consented events land.
export const PUBLISHED_EVENTS: EventItem[] = publishedOnly(EVENTS);
