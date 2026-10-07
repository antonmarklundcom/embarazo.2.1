import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { weeksExportJson } from "../lib/weeksExport.ts";

// F11 — write contracts/weeks.v1.json, the week data embarazo.com.py imports
// (its tools/import-weeks.mjs). Committed; lib/weeksExport.test.ts fails when
// it is stale. Writes only when the content changed, so a no-op run leaves the
// tree clean.

const target = join(import.meta.dirname, "..", "contracts", "weeks.v1.json");
const next = weeksExportJson();
let current = "";
try {
  current = readFileSync(target, "utf8");
} catch {
  current = "";
}
if (current === next) {
  console.log("contracts/weeks.v1.json is up to date.");
} else {
  writeFileSync(target, next, "utf8");
  console.log("Wrote contracts/weeks.v1.json.");
}
