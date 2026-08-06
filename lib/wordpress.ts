import type { AdPlacement, Article, DirectoryListing } from "./types";
import { ARTICLES } from "./seed/articles";
import directoryData from "./seed/directory.json";
import placementsData from "./seed/placements.json";
import { publishedOnly } from "./seed/gate";
import {
  AdPlacementSchema,
  DirectoryListingSchema,
  validateContentArray,
} from "./content/schemas";

// Optional future content source (build spec §5).
// IF WP_API_URL is set, these functions could read a WordPress REST API.
// For the MVP they always return the in-repo seed data so the app runs
// fully offline / on first clone. The integration is intentionally NOT built.

const WP_API_URL = process.env.WP_API_URL;

// G1 content ops: validated at import time, same as the other seed files —
// a malformed listing/placement throws immediately, naming the file and the
// entry, rather than shipping quietly.
const directoryResult = validateContentArray(
  "lib/seed/directory.json",
  directoryData.listings as unknown[],
  DirectoryListingSchema,
);
if (directoryResult.errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/directory.json:\n${directoryResult.errors.join("\n")}`,
  );
}
const placementsResult = validateContentArray(
  "lib/seed/placements.json",
  placementsData.placements as unknown[],
  AdPlacementSchema,
);
if (placementsResult.errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/placements.json:\n${placementsResult.errors.join("\n")}`,
  );
}

// Placeholder gate (BUILD-PLAN Z1). Filtering here rather than at each call
// site means the API routes, the home-screen resources block and the directory
// page are all covered by construction: invented businesses and sponsors with
// non-working +595 numbers can never reach a user. Entries appear automatically
// once they carry real data.
const SEED_DIRECTORY: DirectoryListing[] = publishedOnly(directoryResult.valid);
const SEED_PLACEMENTS: AdPlacement[] = publishedOnly(placementsResult.valid);

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
