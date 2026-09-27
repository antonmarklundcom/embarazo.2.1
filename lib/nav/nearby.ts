import { PUBLISHED_EVENTS } from "@/lib/seed/events";
import { getDirectory } from "@/lib/wordpress";

/**
 * Whether "Cerca tuyo" has anything to show: a published directory listing or
 * a published event (both live under that tab). Uses the same placeholder gate
 * the directory API and the events page render through, so the tab and the
 * page can never disagree about what is published.
 */
export async function nearbyHasContent(): Promise<boolean> {
  const listings = await getDirectory();
  return listings.length > 0 || PUBLISHED_EVENTS.length > 0;
}
