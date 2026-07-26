import type { AdPlacement, Article, DirectoryListing } from "./types";
import { ARTICLES, DIRECTORY } from "./content";
import placementsData from "./seed/placements.json";
import { publishedOnly } from "./seed/gate";

// Content source (build spec §5).
//
// Articles and the directory come from `content/*.json`, validated by
// `npm run validate:content` (BUILD-PLAN G1) — the founder edits JSON, not
// TypeScript, and CI catches the mistakes a schema can catch.
//
// IF WP_API_URL is set these functions could read a WordPress REST API
// instead. That integration is intentionally NOT built.

const WP_API_URL = process.env.WP_API_URL;

// Placements still live in the old seed file: they are ad inventory rather
// than editorial content, and there are no real sponsors yet. The Z1 gate keeps
// the invented ones invisible until there are.
const SEED_PLACEMENTS = publishedOnly(placementsData.placements as AdPlacement[]);

export async function getArticles(): Promise<Article[]> {
  if (WP_API_URL) {
    // TODO(wordpress): map WP posts → Article. Left unimplemented on purpose.
  }
  return ARTICLES;
}

export async function getDirectory(): Promise<DirectoryListing[]> {
  if (WP_API_URL) {
    // TODO(wordpress): map a "directory" CPT → DirectoryListing. Not built.
  }
  return DIRECTORY;
}

export async function getPlacements(): Promise<AdPlacement[]> {
  if (WP_API_URL) {
    // TODO(wordpress): map a "placement" CPT → AdPlacement. Not built.
  }
  return SEED_PLACEMENTS;
}
