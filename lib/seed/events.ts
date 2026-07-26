import { EVENTS } from "../content";

// Events now live in content/events.json, validated by
// `npm run validate:content` (BUILD-PLAN G1). Every event carries a FIXED
// date and time — the previous seed computed dates at module load, so every
// deploy silently moved every event.
//
// The Eventos tab shows its empty state while this is empty.
export { EVENTS };
export const PUBLISHED_EVENTS = EVENTS;
