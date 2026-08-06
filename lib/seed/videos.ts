import type { VideoItem } from "../types";
import { publishedOnly } from "./gate";
import { VideoItemSchema, validateContentArray } from "../content/schemas";
import rawVideos from "./videos.json";

// Curated educational video gallery (build spec §4).
//
// PLACEHOLDER SEED DATA — replace before launch.
// The `youtubeId` values below are PLACEHOLDERS using well-known public videos
// (e.g. official channels / a famous public sample). Swap them for real,
// curated, es-PY pregnancy/health videos with permission to feature them.
// Videos are embedded via youtube-nocookie.com (privacy-enhanced mode); nothing
// is self-hosted and there is no backend.
//
// G1 content ops: content lives in videos.json (validated JSON). To edit:
// add/remove entries there. `topic` drives the topic filter and `trimester`
// (0 = general/todos) drives the trimester filter.
const { valid, errors } = validateContentArray(
  "lib/seed/videos.json",
  rawVideos as unknown[],
  VideoItemSchema,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/videos.json:\n${errors.join("\n")}`);
}

export const VIDEOS: VideoItem[] = valid;

// Placeholder gate (BUILD-PLAN Z1) — shared with the directory, placements and
// events seeds via `./gate`. Filtering here means the gallery (and its nav
// entries) reappear automatically the moment real entries are added, with no
// other code change.
export const PUBLISHED_VIDEOS: VideoItem[] = publishedOnly(VIDEOS);
