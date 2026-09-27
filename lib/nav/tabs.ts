// Growth plan item 12 — which bottom-nav tabs exist.
//
// "Cerca tuyo" (directory + events) is a tab only while it has something
// published in it. Every seed entry today is a placeholder that `publishedOnly`
// hides, so the tab would open on an empty list; it comes back by itself the
// day one real listing or event lands. The route stays reachable either way.
//
// Pure, so the rule is testable without the seed files: the server layout
// asks `nearbyHasContent()` (lib/nav/nearby.ts) once and passes the answer
// down, which keeps the tab count identical on the server render and after
// hydration — the nav never jumps from four tabs to five on a phone.

export type NavTab = "today" | "guides" | "checklist" | "tools" | "nearby";

export function navTabs(showNearby: boolean): NavTab[] {
  const tabs: NavTab[] = ["today", "guides", "checklist", "tools"];
  if (showNearby) tabs.push("nearby");
  return tabs;
}
