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

// The app's content source: the in-repo seed files.
//
// **K18 deleted the WordPress stubs.** Three functions each carried an
// `if (WP_API_URL) { /* TODO: map WP posts → Article */ }` branch that did
// nothing — it fell through to the seed data regardless. Dead code that looks
// like a feature is worse than no code: it reads as "set WP_API_URL and this
// becomes CMS-backed", which was never true, and a reviewer or a future agent
// has to prove the negative before touching anything near it.
//
// The decision behind the deletion is now settled rather than deferred, and
// §5 D4 is what settles it: **content stays in git.** Build-time validation
// (G1) and offline precache are the point — a CMS-backed article cannot be
// validated at build time and cannot be in the service worker's precache
// manifest, which is most of what makes this app work on a bus in Paraguay.
// If that is ever revisited it will be a task with a data-contract
// classification, not an `if` somebody left behind.
//
// The file keeps its name and its three exported functions: they are the seam
// every caller already imports, and renaming it would be churn in eleven files
// to make a point this comment makes for free.

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
  return ARTICLES;
}

export async function getDirectory(): Promise<DirectoryListing[]> {
  return SEED_DIRECTORY;
}

export async function getPlacements(): Promise<AdPlacement[]> {
  return SEED_PLACEMENTS;
}
