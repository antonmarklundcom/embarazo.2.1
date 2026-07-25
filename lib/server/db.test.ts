import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, isDatabaseConfigured } from "./db";

// BUILD-PLAN A1. The contract under test is the one from ARCHITECTURE.md §4.2:
// the app must run with DATABASE_URL unset. These tests never open a
// connection — they only cover the configured/unconfigured branch, which is
// the part that has to be right for local-only mode to work.

const original = process.env.DATABASE_URL;

beforeEach(() => {
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
});

describe("isDatabaseConfigured", () => {
  it("is false when DATABASE_URL is unset", () => {
    expect(isDatabaseConfigured()).toBe(false);
  });

  it("is false when DATABASE_URL is blank or whitespace", () => {
    process.env.DATABASE_URL = "";
    expect(isDatabaseConfigured()).toBe(false);
    process.env.DATABASE_URL = "   ";
    expect(isDatabaseConfigured()).toBe(false);
  });

  it("is true once a connection string is present", () => {
    process.env.DATABASE_URL = "mysql://user:pw@localhost:3306/mibebe";
    expect(isDatabaseConfigured()).toBe(true);
  });
});

describe("db", () => {
  it("throws a pointed error rather than connecting when unconfigured", () => {
    expect(() => db()).toThrow(/isDatabaseConfigured/);
  });
});
