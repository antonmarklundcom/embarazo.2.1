import { describe, expect, it } from "vitest";

import type { ContractionEntry, JournalEntry, KickSession, WeightEntry } from "@/lib/db";
import {
  CONTROL_QUESTIONS,
  MAX_OWN_QUESTIONS,
  parsePicks,
  questionsForWeek,
  summarizeRecent,
} from "./controlPrep";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 23, 12).getTime();

describe("questionsForWeek", () => {
  it("gives every week from 1 to 42 something to ask", () => {
    for (let week = 1; week <= 42; week += 1) {
      expect(questionsForWeek(week).length, `week ${week}`).toBeGreaterThan(0);
    }
  });

  it("puts the questions for her stage before the general ones", () => {
    const ids = questionsForWeek(22).map((q) => q.id);
    expect(ids).toContain("t2-morfologica");
    expect(ids.indexOf("t2-morfologica")).toBeLessThan(ids.indexOf("g-sintomas"));
    expect(ids).not.toContain("t4-cuando-ir");
  });

  it("asks, never answers — every entry is a question", () => {
    for (const q of CONTROL_QUESTIONS) {
      expect(q.text.trim().endsWith("?"), q.id).toBe(true);
      expect(q.from).toBeLessThanOrEqual(q.to);
    }
  });

  it("has unique ids", () => {
    const ids = CONTROL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("summarizeRecent", () => {
  const empty = { weights: [], journal: [], kicks: [], contractions: [] };

  it("is empty when nothing was logged in the last four weeks", () => {
    const old: WeightEntry = { date: NOW - 40 * DAY, kg: 60 } as WeightEntry;
    expect(summarizeRecent({ ...empty, weights: [old] }, NOW).empty).toBe(true);
  });

  it("reports the weight change inside the window only", () => {
    const weights = [
      { date: NOW - 60 * DAY, kg: 55 },
      { date: NOW - 20 * DAY, kg: 60 },
      { date: NOW - 2 * DAY, kg: 61.4 },
    ] as WeightEntry[];
    expect(summarizeRecent({ ...empty, weights }, NOW).weight).toEqual({
      from: 60,
      to: 61.4,
      diff: 1.4,
    });
  });

  it("counts symptoms, low-mood days (not entries) and sessions", () => {
    const journal = [
      { createdAt: NOW - 1 * DAY, symptoms: ["Náuseas", "Acidez"], mood: "mal" },
      { createdAt: NOW - 1 * DAY + 3600_000, symptoms: ["Náuseas"], mood: "muy_mal" },
      { createdAt: NOW - 5 * DAY, symptoms: ["Acidez", "Náuseas"], mood: "bien" },
    ] as JournalEntry[];
    const kicks = [{ startedAt: NOW - DAY, count: 10 }] as KickSession[];
    const contractions = [
      { startedAt: NOW - DAY, durationSec: 40 },
      { startedAt: NOW - 50 * DAY, durationSec: 40 },
    ] as ContractionEntry[];

    const summary = summarizeRecent({ weights: [], journal, kicks, contractions }, NOW);
    expect(summary.topSymptoms).toEqual([
      ["Náuseas", 3],
      ["Acidez", 2],
    ]);
    expect(summary.lowMoodDays).toBe(1);
    expect(summary.kickSessions).toBe(1);
    expect(summary.contractions).toBe(1);
    expect(summary.empty).toBe(false);
  });
});

describe("parsePicks", () => {
  it("survives garbage and unknown ids", () => {
    expect(parsePicks(null)).toEqual({ picked: [], own: [] });
    expect(parsePicks("{nope")).toEqual({ picked: [], own: [] });
    expect(parsePicks(JSON.stringify({ picked: ["g-sintomas", "gone", 3], own: ["  ", "¿Puedo viajar?"] }))).toEqual({
      picked: ["g-sintomas"],
      own: ["¿Puedo viajar?"],
    });
  });

  it("caps her own list", () => {
    const own = Array.from({ length: 30 }, (_, i) => `Pregunta ${i}`);
    expect(parsePicks(JSON.stringify({ picked: [], own })).own).toHaveLength(MAX_OWN_QUESTIONS);
  });
});

describe("Borrar todos mis datos", () => {
  it("wipes her control questions too", async () => {
    const { readFileSync } = await import("node:fs");
    const { CONTROL_STORAGE_KEY } = await import("./controlPrep");
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain(`removeItem("${CONTROL_STORAGE_KEY}")`);
  });
});
