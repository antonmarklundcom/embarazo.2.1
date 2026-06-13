import type { AdPlacement, Article, DirectoryListing } from "./types";
import { ARTICLES } from "./seed/articles";
import directoryData from "./seed/directory.json";
import placementsData from "./seed/placements.json";

// Optional future content source (build spec §5).
// IF WP_API_URL is set, these functions could read a WordPress REST API.
// For the MVP they always return the in-repo seed data so the app runs
// fully offline / on first clone. The integration is intentionally NOT built.

const WP_API_URL = process.env.WP_API_URL;

const SEED_DIRECTORY = (directoryData.listings as DirectoryListing[]);
const SEED_PLACEMENTS = (placementsData.placements as AdPlacement[]);

export async function getArticles(): Promise<Article[]> {
  if (WP_API_URL) {
    // TODO(wordpress): map WP posts → Article {
    //   slug, title, excerpt, html (rendered content), date, author, reviewedBy (ACF), cluster (category)
    // }. Left unimplemented on purpose for the MVP.
  }
  return ARTICLES;
}

export async function getDirectory(): Promise<DirectoryListing[]> {
  if (WP_API_URL) {
    // TODO(wordpress): map a "directory" CPT → DirectoryListing. Not built for the MVP.
  }
  return SEED_DIRECTORY;
}

export async function getPlacements(): Promise<AdPlacement[]> {
  if (WP_API_URL) {
    // TODO(wordpress): map a "placement" CPT → AdPlacement. Not built for the MVP.
  }
  return SEED_PLACEMENTS;
}
