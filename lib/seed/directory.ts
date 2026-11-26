import type { DirectoryListing } from "../types";
import { DirectoryListingSchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";
import directoryData from "./directory.json";

// The directory's published listings, on their own so a client component can
// ask "is there anything behind /directorio?" without importing the whole
// content source (`lib/wordpress.ts` also loads every article).
// `getDirectory()` returns this same array, so the "Cerca tuyo" tab, the
// directory API and every link to the directory agree on what is published.

// G1 content ops: validated at import time — a malformed listing throws
// immediately, naming the file and the entry, rather than shipping quietly.
const { valid, errors } = validateContentArray(
  "lib/seed/directory.json",
  directoryData.listings as unknown[],
  DirectoryListingSchema,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/directory.json:\n${errors.join("\n")}`);
}

// Placeholder gate (BUILD-PLAN Z1): invented businesses with non-working +595
// numbers never reach a user. Entries appear once they carry real data.
export const PUBLISHED_DIRECTORY: DirectoryListing[] = publishedOnly(valid);
