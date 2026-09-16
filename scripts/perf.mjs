// Perf budget gate (W6, docs/log/w6.md). Runs Lighthouse (mobile preset)
// against a production server, 3 runs per URL, and fails on any budget miss.
//
// Usage: npm run build && npm run perf
//
// Uses the pre-installed Chromium at /opt/pw-browsers/chromium when present
// (same convention as scripts/gen-screenshots.mjs); otherwise lets Lighthouse
// launch its own Chrome via chrome-launcher.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs", "perf");
mkdirSync(OUT_DIR, { recursive: true });

const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROMIUM_PATH = "/opt/pw-browsers/chromium";
const RUNS_PER_URL = 3;

const URLS = ["/", "/semana/20", "/herramientas", "/guias"];

// On Windows, `npx` resolves to npx.cmd; spawn() needs shell:true to find it
// via PATH the way a shell would (matches the ENOENT workaround needed for
// scripts/gen-screenshots.mjs's npx invocation on this platform).
const IS_WINDOWS = process.platform === "win32";

const BUDGET = {
  performance: { op: "gte", value: 90, label: "performance score", unit: "" },
  lcp: { op: "lte", value: 3500, label: "LCP", unit: "ms" },
  cls: { op: "eq", value: 0, label: "CLS", unit: "" },
  tbt: { op: "lte", value: 200, label: "TBT", unit: "ms" },
};

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not start in time");
}

function runLighthouseOnce(url) {
  const args = [
    "--yes",
    "lighthouse",
    url,
    "--output=json",
    "--output-path=stdout",
    '--chrome-flags=--headless=new --no-sandbox',
    "--quiet",
  ];
  const env = { ...process.env };
  if (existsSync(CHROMIUM_PATH)) {
    env.CHROME_PATH = CHROMIUM_PATH;
  }
  const result = spawnSync("npx", args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: IS_WINDOWS,
  });
  if (result.status !== 0 && !result.stdout) {
    throw new Error(
      `lighthouse failed for ${url}: ${result.stderr?.slice(0, 2000) ?? "(no stderr)"}`
    );
  }
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `lighthouse produced unparseable output for ${url}: ${result.stderr?.slice(0, 2000) ?? result.stdout?.slice(0, 500)}`
    );
  }
  const perf = report.categories?.performance?.score;
  const lcp = report.audits?.["largest-contentful-paint"]?.numericValue;
  const cls = report.audits?.["cumulative-layout-shift"]?.numericValue;
  const tbt = report.audits?.["total-blocking-time"]?.numericValue;
  if (
    perf === undefined ||
    perf === null ||
    lcp === undefined ||
    cls === undefined ||
    tbt === undefined
  ) {
    throw new Error(`lighthouse report for ${url} is missing expected audits`);
  }
  return { performance: perf * 100, lcp, cls, tbt };
}

function evaluate(metric, actual) {
  const { op, value } = BUDGET[metric];
  if (op === "gte") return actual >= value;
  if (op === "lte") return actual <= value;
  if (op === "eq") return actual === value;
  throw new Error(`unknown op ${op}`);
}

async function main() {
  // Spawn `next start` directly (not via `npm run start`) so killing this
  // one process actually stops the server, same as scripts/gen-screenshots.mjs.
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: "inherit",
    shell: IS_WINDOWS,
  });

  const results = {};
  let anyFailure = false;
  const failures = [];

  try {
    await waitForServer(BASE_URL);

    for (const path of URLS) {
      const url = BASE_URL + path;
      console.log(`\nRunning Lighthouse against ${url} (${RUNS_PER_URL} runs)...`);
      const runs = [];
      for (let i = 0; i < RUNS_PER_URL; i++) {
        console.log(`  run ${i + 1}/${RUNS_PER_URL}...`);
        const run = runLighthouseOnce(url);
        runs.push(run);
      }
      const medians = {
        performance: median(runs.map((r) => r.performance)),
        lcp: median(runs.map((r) => r.lcp)),
        cls: median(runs.map((r) => r.cls)),
        tbt: median(runs.map((r) => r.tbt)),
      };
      results[path] = { runs, medians };

      for (const metric of Object.keys(BUDGET)) {
        const pass = evaluate(metric, medians[metric]);
        const { label, unit, op, value } = BUDGET[metric];
        const cmp = op === "eq" ? "=" : op === "gte" ? ">=" : "<=";
        console.log(
          `  ${pass ? "PASS" : "FAIL"} ${label}: ${medians[metric]}${unit} (budget ${cmp} ${value}${unit})`
        );
        if (!pass) {
          anyFailure = true;
          failures.push({ url: path, metric: label, actual: medians[metric], budget: `${cmp} ${value}${unit}` });
        }
      }
    }
  } finally {
    // On Windows, spawning through a shell (needed to resolve npx.cmd) means
    // server.kill() only kills the shell, leaving the real `next start`
    // process (and the port) orphaned. Kill the whole process tree instead.
    if (IS_WINDOWS && server.pid) {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      server.kill();
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    budget: BUDGET,
    results,
    pass: !anyFailure,
  };
  const outPath = join(OUT_DIR, `summary-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${outPath}`);

  if (anyFailure) {
    console.error("\nPerf budget FAILED:");
    for (const f of failures) {
      console.error(`  ${f.url}: ${f.metric} = ${f.actual} (budget ${f.budget})`);
    }
    process.exit(1);
  } else {
    console.log("\nPerf budget PASSED for all URLs.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
