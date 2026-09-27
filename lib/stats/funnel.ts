import "../zodJitless.ts";
import { z } from "zod";

// Growth plan items 16, 17, 18 — where installs come from, and whether they
// stay. Pure half: the wire format, the landing-URL parsing and the weekly
// table. The device half is `lib/stats/funnel.client.ts`, the server half
// `lib/server/funnelStats.ts`.
//
// Same privacy shape as `contentStats` and `placementClicks`, and asserted the
// same way (`funnel.test.ts`, `lib/server/schema.test.ts`):
//
//   * **No user id, no session, no device id, no IP.** A row is
//     `(metric, key, day, count)`. The device remembers what it already sent,
//     in its own localStorage, so "once per install" is enforced where the
//     install is — the server never learns which install sent what.
//   * **Day granularity.** `day` is the server's UTC calendar day of arrival.
//   * **Keys are closed sets or a bounded slug.** A page type from a fixed
//     list, a clinic slug `[a-z0-9-]{1,40}`, or the literal `total`. Nothing a
//     user typed and nothing about her pregnancy.

/** The site's `utm_medium` values (`lib/helpers.php` `app_link` callers). */
export const SITE_MEDIA = [
  "week",
  "tool",
  "article",
  "hub",
  "home",
  "content",
  "product",
] as const;
export type SiteMedium = (typeof SITE_MEDIA)[number] | "other";

/** Anything the site sends that is not on the list is counted, as `other`. */
export function siteMedium(raw: string | null | undefined): SiteMedium {
  const value = (raw ?? "").trim().toLowerCase();
  return (SITE_MEDIA as readonly string[]).includes(value) ? (value as SiteMedium) : "other";
}

/** Item 18 — a clinic QR card's `?src=`. */
export const QR_SOURCE_RE = /^[a-z0-9-]{1,40}$/;

/**
 * `?src=` as printed on a card: trimmed and lower-cased (a card typed as
 * "Clinica-Sur" is the same clinic), then it must be `[a-z0-9-]{1,40}` or it
 * is dropped. Dropped, not truncated: a mangled slug counted under a new key
 * would split one clinic across two rows.
 */
export function qrSource(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = raw.trim().toLowerCase();
  return QR_SOURCE_RE.test(value) ? value : null;
}

/** Where this install came from, fixed on its first page load. */
export type Channel = "directo" | "qr" | `sitio-${SiteMedium}`;

export const CHANNELS: readonly Channel[] = [
  "directo",
  "qr",
  ...[...SITE_MEDIA, "other" as const].map((m) => `sitio-${m}` as const),
];

export interface Landing {
  /** Set when the URL carries `utm_source=site`. */
  medium: SiteMedium | null;
  src: string | null;
}

/** Read the landing URL's query string. Never throws. */
export function landingFromSearch(search: string): Landing {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return { medium: null, src: null };
  }
  const fromSite = params.get("utm_source")?.trim().toLowerCase() === "site";
  return {
    medium: fromSite ? siteMedium(params.get("utm_medium")) : null,
    src: qrSource(params.get("src")),
  };
}

/** A QR card beats a site link when a URL somehow carries both. */
export function channelOf(landing: Landing): Channel {
  if (landing.src) return "qr";
  if (landing.medium) return `sitio-${landing.medium}`;
  return "directo";
}

/** Days after onboarding from which an open counts as "came back". */
export const RETURN_AFTER_DAYS = 7;

const MediumKey = z.enum([...SITE_MEDIA, "other"]);
const ChannelKey = z.enum(CHANNELS as [Channel, ...Channel[]]);

/**
 * The whole POST body, one of five shapes. `.strict()` on each, so a field
 * nobody designed (an id, a week, a department) is a 400 the first time it is
 * sent rather than a silent widening of what this table learns.
 */
export const FunnelEventSchema = z.discriminatedUnion("metric", [
  z.object({ metric: z.literal("arrival"), key: MediumKey }).strict(),
  z.object({ metric: z.literal("qr"), key: z.string().regex(QR_SOURCE_RE) }).strict(),
  z.object({ metric: z.literal("onboarded"), key: ChannelKey }).strict(),
  z.object({ metric: z.literal("first_tool"), key: z.literal("total") }).strict(),
  z.object({ metric: z.literal("return7"), key: z.literal("total") }).strict(),
]);
export type FunnelEvent = z.infer<typeof FunnelEventSchema>;
export type FunnelMetric = FunnelEvent["metric"];

export const FUNNEL_METRICS: readonly FunnelMetric[] = [
  "arrival",
  "qr",
  "onboarded",
  "first_tool",
  "return7",
];

/** One stored row, as the admin page reads it. */
export interface FunnelRow {
  metric: string;
  key: string;
  day: string;
  count: number;
}

/** Monday of the UTC week `day` ("YYYY-MM-DD") falls in, as "YYYY-MM-DD". */
export function weekStart(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export interface WeeklyFunnel {
  /** Monday, "YYYY-MM-DD". */
  week: string;
  arrivals: number;
  qr: number;
  onboarded: number;
  firstTool: number;
  return7: number;
}

/**
 * Item 17's weekly table: the last `weeks` Mondays up to `now`, newest first,
 * every week present even when empty (an empty week is the row to notice).
 */
export function weeklyFunnel(rows: readonly FunnelRow[], now: Date, weeks = 8): WeeklyFunnel[] {
  const thisWeek = weekStart(now.toISOString().slice(0, 10));
  const out: WeeklyFunnel[] = [];
  const byWeek = new Map<string, WeeklyFunnel>();
  for (let i = 0; i < weeks; i += 1) {
    const d = new Date(`${thisWeek}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    const week = d.toISOString().slice(0, 10);
    const row = { week, arrivals: 0, qr: 0, onboarded: 0, firstTool: 0, return7: 0 };
    out.push(row);
    byWeek.set(week, row);
  }
  for (const row of rows) {
    const target = byWeek.get(weekStart(row.day));
    if (!target) continue;
    if (row.metric === "arrival") target.arrivals += row.count;
    else if (row.metric === "qr") target.qr += row.count;
    else if (row.metric === "onboarded") target.onboarded += row.count;
    else if (row.metric === "first_tool") target.firstTool += row.count;
    else if (row.metric === "return7") target.return7 += row.count;
  }
  return out;
}

/** Totals per key for one metric, largest first — the by-channel tables. */
export function totalsByKey(
  rows: readonly FunnelRow[],
  metric: FunnelMetric,
): { key: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.metric !== metric) continue;
    totals.set(row.key, (totals.get(row.key) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
