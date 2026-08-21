// FABLE-PLAN K15 — sponsor click reporting, pure half.
//
// The grouping lives here, away from `server-only`, for the same reason
// `rankByBucket` does: it is the interesting half and it should not need a
// MySQL to check.
//
// **Days are UTC**, inherited from `dayKey`. Paraguay is UTC-3 (UTC-4 in the
// southern winter), so a tap at 21:30 in Asunción lands in the next day's
// bucket and, on the last day of a month, in the next month's. That is a
// handful of clicks on a boundary, it is the same skew `contentStats` already
// has, and the fix — a timezone the whole app would have to agree on — is not
// worth buying for a report whose unit is "roughly how many people wrote to
// this sponsor in October". It is stated on the page rather than hidden here.

/** One row of the `placementClicks` table. */
export interface ClickRow {
  placementId: string;
  /** "YYYY-MM-DD". */
  day: string;
  clicks: number;
}

export interface PlacementMonthItem {
  placementId: string;
  clicks: number;
}

/** One month, and what every placement got in it. */
export interface PlacementMonth {
  /** "YYYY-MM". */
  month: string;
  total: number;
  items: PlacementMonthItem[];
}

/**
 * The month a day bucket belongs to, or null if the key is not a day bucket.
 *
 * Null rather than a guess: a malformed row is a bug somewhere upstream, and
 * silently filing it under the current month would put somebody else's clicks
 * on a sponsor's invoice.
 */
export function monthKey(day: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.slice(0, 7) : null;
}

/**
 * Day rows in, months out — newest month first, biggest placement first.
 *
 * Ties are broken by id so the page does not reshuffle between renders on two
 * sponsors who both got four clicks.
 */
export function summariseClicks(rows: readonly ClickRow[]): PlacementMonth[] {
  const months = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const month = monthKey(row.day);
    if (!month) continue;
    const clicks = Number(row.clicks);
    if (!Number.isFinite(clicks) || clicks <= 0) continue;

    const forMonth = months.get(month) ?? new Map<string, number>();
    forMonth.set(row.placementId, (forMonth.get(row.placementId) ?? 0) + clicks);
    months.set(month, forMonth);
  }

  return [...months.entries()]
    .map(([month, counts]) => {
      const items = [...counts.entries()]
        .map(([placementId, clicks]) => ({ placementId, clicks }))
        .sort((a, b) => b.clicks - a.clicks || a.placementId.localeCompare(b.placementId));
      return {
        month,
        total: items.reduce((sum, item) => sum + item.clicks, 0),
        items,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month));
}

/** "2026-08" → "agosto 2026", for the report's headings. */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1));
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("es-PY", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
