import type { Config } from "drizzle-kit";

// BUILD-PLAN A1. `npm run db:generate` writes SQL migrations from
// lib/server/schema.ts; `npm run db:migrate` applies them.
//
// Generating migrations does NOT need a live database — only `db:migrate`
// does. That keeps schema changes reviewable in a PR without anyone holding
// database credentials.
export default {
  schema: "./lib/server/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // Migrations are checked in and reviewed; never let the tool push silently.
  strict: true,
  verbose: true,
} satisfies Config;
