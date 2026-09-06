import { describe, expect, it } from "vitest";

import { ExerciseSchema, type Exercise } from "../content/schemas";
import { publishedOnly } from "./gate";
import { EJERCICIOS, PUBLISHED_EJERCICIOS, getEjercicioById } from "./ejercicios";

// D6 — "Ejercicios" ships gated exactly like the directory/events/videos: no
// real step images exist yet, so the tool stays locked until the founder
// drops files in and edits the JSON. These tests are what makes that true,
// plus the one data invariant the content itself must hold.

const SUPINE_PHRASES = ["boca arriba", "acostada de espalda", "acostada boca arriba"];

describe("ejercicios content (D6)", () => {
  it("has 10–14 exercises, all currently placeholder-gated", () => {
    expect(EJERCICIOS.length).toBeGreaterThanOrEqual(10);
    expect(EJERCICIOS.length).toBeLessThanOrEqual(14);
  });

  it("publishes nothing until real images replace the placeholder", () => {
    expect(PUBLISHED_EJERCICIOS).toHaveLength(0);
  });

  it("every entry carries avoidIf and stopSigns", () => {
    for (const exercise of EJERCICIOS) {
      expect(exercise.avoidIf.length, exercise.id).toBeGreaterThan(0);
      expect(exercise.stopSigns.length, exercise.id).toBeGreaterThan(0);
    }
  });

  it("never instructs a supine (boca arriba) position, at any trimester", () => {
    // The data rule is "no supine positions after week 16" — this app ships
    // no week-precision on exercises, only trimesters, and trimester 2 spans
    // both sides of week 16. The content simply never uses a supine position
    // at all (side-lying instead), which satisfies the rule for every
    // trimester rather than only the ones after week 16.
    for (const exercise of EJERCICIOS) {
      const haystack = [
        exercise.title,
        ...exercise.benefits,
        ...exercise.steps.map((s) => s.text),
      ]
        .join(" ")
        .toLowerCase();
      for (const phrase of SUPINE_PHRASES) {
        expect(haystack, `${exercise.id} mentions a supine position`).not.toContain(phrase);
      }
    }
  });

  it("ids are unique and ejercicios.ts's loader keys by id", () => {
    const ids = new Set(EJERCICIOS.map((e) => e.id));
    expect(ids.size).toBe(EJERCICIOS.length);
  });
});

describe("getEjercicioById", () => {
  it("finds nothing today — every entry is unpublished", () => {
    for (const exercise of EJERCICIOS) {
      expect(getEjercicioById(exercise.id)).toBeUndefined();
    }
  });
});

describe("the gate itself, proven against a synthetic fixture", () => {
  // The production content can never ship a real image path in this PR (the
  // tools tile must stay locked today), so this is what proves "an entry
  // lights up once its imageSrc points at a real, committed file, no code
  // change" without shipping that state for real.
  const base: Exercise = ExerciseSchema.parse({
    id: "fixture-interno",
    title: "Ejercicio de prueba",
    trimesters: [1],
    durationMin: 5,
    equipment: "sin equipo",
    benefits: ["beneficio de prueba"],
    steps: [{ text: "paso de prueba", imageSrc: "/assets/ejercicios/placeholder.webp" }],
    avoidIf: ["si tu médico te indicó reposo"],
    stopSigns: ["dolor"],
    source: "ACOG",
  });

  it("stays hidden with a placeholder imageSrc", () => {
    expect(publishedOnly([base])).toHaveLength(0);
  });

  it("lights up once imageSrc points at a real file, no other change", () => {
    const lit: Exercise = {
      ...base,
      steps: [{ text: base.steps[0]!.text, imageSrc: "/assets/ejercicios/fixture-interno-1.webp" }],
    };
    expect(publishedOnly([lit])).toEqual([lit]);
  });
});
