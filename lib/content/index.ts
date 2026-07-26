import type { Article, DirectoryListing, EventItem, VideoItem } from "../types";
import articlesData from "../../content/articles.json";
import videosData from "../../content/videos.json";
import directoryData from "../../content/directory.json";
import eventsData from "../../content/events.json";
import foodData from "../../content/food.json";
import weekNotesData from "../../content/week-notes.json";
import type {
  ArticleContent,
  DirectoryContent,
  EventContent,
  FoodContent,
  VideoContent,
  WeekNoteContent,
} from "./schema";

// Content loader (BUILD-PLAN G1).
//
// The JSON under `content/` is the single source of truth for everything the
// founder writes. It is validated by `npm run validate:content` in CI rather
// than at runtime: an invalid file cannot reach a deploy, so paying to
// re-validate on every server start would buy nothing.
//
// Types are asserted rather than parsed here for the same reason. The
// alternative — parsing on import — would mean a content mistake becomes a
// runtime crash for users instead of a red build for us.

export const ARTICLES = (articlesData.articles as ArticleContent[]).map(
  (a): Article => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    date: a.date,
    author: a.author,
    // The app's Article type predates nullable reviewers; an unreviewed
    // article simply has no byline (MedicalReviewByline renders nothing).
    reviewedBy: a.reviewedBy ?? "",
    cluster: a.cluster,
    html: a.html,
  }),
);

/** Article slugs keyed by the week they are most relevant to (C6). */
export const ARTICLE_WEEKS = new Map<number, string[]>();
for (const a of articlesData.articles as ArticleContent[]) {
  if (a.week === undefined) continue;
  const list = ARTICLE_WEEKS.get(a.week) ?? [];
  list.push(a.slug);
  ARTICLE_WEEKS.set(a.week, list);
}

export const VIDEOS = (videosData.videos as VideoContent[]).map(
  (v): VideoItem => ({
    id: v.id,
    title: v.title,
    description: v.description,
    topic: v.topic,
    trimester: v.trimester,
    week: v.week,
    youtubeId: v.youtubeId,
    durationLabel: v.durationLabel,
  }),
);

export const DIRECTORY = (directoryData.listings as DirectoryContent[]).map(
  (l): DirectoryListing => ({
    id: l.id,
    name: l.name,
    category: l.category,
    department: l.department as DirectoryListing["department"],
    city: l.city,
    address: l.address,
    whatsappNumber: l.whatsappNumber,
    mapsUrl: l.mapsUrl,
    isSponsored: l.isSponsored,
    priority: l.priority,
  }),
);

export const EVENTS = (eventsData.events as EventContent[]).map(
  (e): EventItem => ({
    id: e.id,
    title: e.title,
    type: e.type,
    department: e.department as EventItem["department"],
    city: e.city,
    venue: e.venue,
    // Paraguay does not observe DST, so a fixed -04:00 offset is exact.
    // Storing the offset rather than relying on the server's zone is what
    // keeps an event from shifting depending on where the build runs.
    date: new Date(`${e.startsAt}:00-04:00`).getTime(),
    description: e.description,
    organizer: e.organizer,
    whatsappNumber: e.whatsappNumber,
    mapsUrl: e.mapsUrl,
    isSponsored: e.isSponsored,
  }),
);

export const FOODS = foodData.foods as FoodContent[];

/**
 * Only reviewed foods publish. A verdict like "sí, podés comer esto en el
 * embarazo" is a medical claim, unlike a general article — see the note in
 * schema.ts.
 */
export const PUBLISHED_FOODS = FOODS.filter((f) => f.reviewedBy !== null);

export const WEEK_NOTES = new Map<number, WeekNoteContent>(
  (weekNotesData.notes as WeekNoteContent[]).map((n) => [n.week, n]),
);

/** The one-line "what is happening right now" for a week, when we have one. */
export function weekNote(week: number): string | undefined {
  return WEEK_NOTES.get(week)?.text;
}

/** Look up a guía by slug. Returns undefined when it does not exist. */
export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
