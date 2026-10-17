import { describe, expect, it } from "vitest";

import { ROLE_ORDER } from "@/lib/roleCopy";
import { perspectivesFor } from "@/lib/seed/perspectives";
import { storiesForWeek } from "@/lib/stories";

describe("storiesForWeek", () => {
  it("gives every week and role a well-formed set, baby first and symptoms last", () => {
    for (let week = 1; week <= 42; week += 1) {
      for (const role of ROLE_ORDER) {
        const stories = storiesForWeek(week, role);
        expect(stories.length).toBeGreaterThanOrEqual(3);
        expect(stories[0]?.id).toBe("bebe");
        expect(stories.at(-1)?.id).toBe("sintomas");
        expect(new Set(stories.map((s) => s.id)).size).toBe(stories.length);
        for (const story of stories) {
          expect(story.title.trim()).not.toBe("");
          expect(story.body.length).toBeGreaterThan(0);
          for (const paragraph of story.body) expect(paragraph.trim()).not.toBe("");
          if (story.cta) expect(story.cta.href.startsWith("/")).toBe(true);
        }
      }
    }
  });

  it("shows the baby render only from week 3, where the art starts", () => {
    expect(storiesForWeek(2)[0]?.image).toBeUndefined();
    expect(storiesForWeek(3)[0]?.image?.src).toMatch(/\/assets\/semanas\/bebe-3\.webp/);
  });

  it("opens on the reader's own perspective as Vos", () => {
    const band = perspectivesFor(20);
    expect(band).not.toBeNull();
    const vos = (role: "mama" | "papa" | "familiar") => storiesForWeek(20, role).find((s) => s.id === "vos")?.body[0];
    expect(vos("mama")).toBe(band?.vos);
    expect(vos("papa")).toBe(band?.pareja);
    expect(vos("familiar")).toBe(band?.familia);
    // The other two stay available under their own names.
    const ids = storiesForWeek(20, "papa").map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["ella", "familia"]));
    expect(ids).not.toContain("pareja");
    expect(storiesForWeek(20, "papa").find((s) => s.id === "ella")?.body[0]).toBe(band?.vos);
  });

  it("uses only shipped content: control questions and exercises for the stage", () => {
    const preguntas = storiesForWeek(30).find((s) => s.id === "preguntas");
    expect(preguntas?.list?.length).toBeGreaterThan(0);
    const ejercicio = storiesForWeek(30).find((s) => s.id === "ejercicio");
    expect(ejercicio?.cta?.href).toMatch(/^\/herramientas\/ejercicios\/[a-z0-9-]+$/);
  });
});
