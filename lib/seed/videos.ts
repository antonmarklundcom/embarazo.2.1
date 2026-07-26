import { VIDEOS } from "../content";

// Videos now live in content/videos.json, validated by
// `npm run validate:content` (BUILD-PLAN G1). The schema rejects the old
// placeholder id outright, so the Z1 gate is no longer needed here — an
// invalid video cannot reach the repo in the first place.
//
// The gallery and its two nav entry points hide themselves while this is
// empty, and light up automatically when real videos are added.
export { VIDEOS };
export const PUBLISHED_VIDEOS = VIDEOS;
