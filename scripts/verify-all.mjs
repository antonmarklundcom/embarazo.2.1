// One local command that runs the repo gates in order and stops at the first
// failure. Each gate's combined stdout/stderr goes to its own log file.
//
//   npm run verify                     # all gates, logs in verify-logs/
//   npm run verify -- --skip-build     # everything except `next build`
//   npm run verify -- --logs <dir>     # write logs somewhere else
//   npm run verify -- --e2e "e2e/ya-nacio.spec.ts e2e/onboarding.spec.ts"
//   npm run verify -- --e2e all        # after the build, run Playwright specs too
//
// Plain Node ESM, no dependencies. `shell: true` so the npm/npx/node commands
// resolve on Windows as well as POSIX.

import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const BUILD_ENV = {
  PHOTO_STORAGE_ENDPOINT: "https://bucket.example.test",
  NEXT_PUBLIC_SUPPORT_EMAIL: "hola@mibebe.example.py",
};

const GATES = [
  {
    name: "typescript",
    command: "node node_modules/typescript/bin/tsc --noEmit --incremental false",
  },
  { name: "lint", command: "npm run lint" },
  { name: "vitest", command: "npx vitest run --maxWorkers=2" },
  { name: "test-db", command: "npm run test:db" },
  { name: "validate-content", command: "npm run validate:content" },
  { name: "build", command: "npm run build", env: BUILD_ENV, skippable: true },
];

// Optional e2e gate, run after the build because `playwright test` serves the
// production build. `--e2e all` runs every spec; otherwise the value is a list
// of spec paths. Each path is checked against a plain pattern before it reaches
// the shell.
function e2eGate(specs) {
  const target = specs === "all" ? "" : `${specs.join(" ")} `;
  return {
    name: "e2e",
    command: `node node_modules/@playwright/test/cli.js test ${target}--workers=2 --reporter=line`,
  };
}

function parseArgs(argv) {
  const options = { logs: join(ROOT, "verify-logs"), skipBuild: false, e2e: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--skip-build") {
      options.skipBuild = true;
    } else if (arg === "--logs") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new Error("--logs needs a directory argument");
      }
      options.logs = resolve(process.cwd(), value);
    } else if (arg === "--e2e") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new Error('--e2e needs spec paths or "all"');
      }
      const specs = value.trim();
      if (specs === "all") {
        options.e2e = "all";
      } else {
        options.e2e = specs.split(/\s+/);
        for (const spec of options.e2e) {
          if (!/^[\w./\\-]+\.spec\.ts$/.test(spec)) {
            throw new Error(`--e2e: not a spec path: ${spec}`);
          }
        }
      }
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (options.e2e && options.skipBuild) {
    throw new Error("--e2e runs against the production build; drop --skip-build");
  }
  return options;
}

function runGate(gate, index, logDir) {
  const logPath = join(logDir, `${index + 1}-${gate.name}.log`);
  const started = Date.now();

  return new Promise((done) => {
    const log = createWriteStream(logPath);
    log.write(`$ ${gate.command}\n\n`);

    const child = spawn(gate.command, {
      cwd: ROOT,
      shell: true,
      env: gate.env ? { ...process.env, ...gate.env } : process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => log.write(chunk));
    child.stderr.on("data", (chunk) => log.write(chunk));

    let settled = false;
    const finish = (ok, detail) => {
      if (settled) return;
      settled = true;
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      log.end(() => done({ ok, seconds, logPath, detail }));
    };

    child.on("error", (error) => {
      log.write(`\nspawn error: ${error.message}\n`);
      finish(false);
    });
    child.on("close", (code, signal) => {
      if (code === 0) {
        finish(true);
      } else {
        finish(false, signal ? `signal ${signal}` : `exit ${code}`);
      }
    });
  });
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`verify-all: ${error.message}`);
    console.error(
      'usage: node scripts/verify-all.mjs [--skip-build] [--logs <dir>] [--e2e "<spec paths>" | --e2e all]',
    );
    return 2;
  }

  mkdirSync(options.logs, { recursive: true });

  const gates = options.e2e ? [...GATES, e2eGate(options.e2e)] : GATES;

  for (let index = 0; index < gates.length; index++) {
    const gate = gates[index];

    if (gate.skippable && options.skipBuild) {
      console.log(`SKIP ${gate.name} 0.0s (--skip-build)`);
      continue;
    }

    const result = await runGate(gate, index, options.logs);
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status} ${gate.name} ${result.seconds}s ${result.logPath}`);

    if (!result.ok) {
      console.log(`verify: stopped at ${gate.name} (${result.detail}); later gates not run`);
      return 1;
    }
  }

  console.log("verify: all gates passed");
  return 0;
}

process.exitCode = await main();
