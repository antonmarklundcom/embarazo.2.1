import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";
import { GET } from "./[questionId]/route";
import { POST as statsPOST } from "../stats/route";
import { PUBLISHED_DAILY_QUESTIONS } from "@/lib/seed/py/dailyQuestions";

// "Pregunta del día" — the routes, with no database (the unit-test and
// local-only configuration). What matters here is what they refuse.

const question = PUBLISHED_DAILY_QUESTIONS[0]!;
const key = question.options[0]!.key;

let ip = 0;
function post(path: string, body: unknown): NextRequest {
  ip += 1; // a fresh rate-limit key per request
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${ip}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function get(questionId: string, query = "") {
  return GET(new NextRequest(`http://localhost/api/v1/poll/${questionId}${query}`), {
    params: Promise.resolve({ questionId }),
  });
}

describe("POST /api/v1/poll", () => {
  it("counts a published answer, with or without a week", async () => {
    expect((await POST(post("/api/v1/poll", { questionId: question.id, optionKey: key }))).status).toBe(204);
    expect(
      (await POST(post("/api/v1/poll", { questionId: question.id, optionKey: key, week: 24 }))).status,
    ).toBe(204);
  });

  it("refuses an unknown question, an unknown option and anything extra", async () => {
    for (const body of [
      { questionId: "no-existe", optionKey: "a" },
      { questionId: question.id, optionKey: "z" },
      { questionId: question.id, optionKey: key, userId: "u1" },
      { questionId: question.id, optionKey: key, week: 99 },
      { contentId: `poll-${question.id}-${key}` },
      "no es json",
    ]) {
      expect((await POST(post("/api/v1/poll", body))).status, JSON.stringify(body)).toBe(400);
    }
  });
});

describe("GET /api/v1/poll/<questionId>", () => {
  it("answers zeros for all three trimesters with no database", async () => {
    const res = await get(question.id);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { questionId: string; trimesters: { trimester: number }[] };
    expect(body.questionId).toBe(question.id);
    expect(body.trimesters.map((t) => t.trimester)).toEqual([1, 2, 3]);
  });

  it("takes the question id and nothing else", async () => {
    for (const query of ["?week=24", "?trimester=2", "?x=1"]) {
      expect((await get(question.id, query)).status, query).toBe(400);
    }
    expect((await get("no-existe")).status).toBe(400);
  });
});

describe("the content-view counter", () => {
  it("refuses a poll- id, so nobody can count an answer around the whitelist", async () => {
    const res = await statsPOST(post("/api/v1/stats", { contentId: `poll-${question.id}-z` }));
    expect(res.status).toBe(400);
    const ok = await statsPOST(post("/api/v1/stats", { contentId: "senales-de-alarma-embarazo" }));
    expect(ok.status).toBe(204);
  });
});
