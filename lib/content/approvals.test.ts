import { describe, expect, it } from "vitest";

import {
  approvalProblems,
  approvalStatus,
  contentHash,
  foodClinicalText,
  formatReviewDate,
  normalizeClinicalText,
  reviewFor,
  type ApprovalRegistry,
} from "./approvals";

// F22 — the rules every reviewed surface renders by, tested once here.

const ANA = { id: "ana-gimenez", name: "Dra. Ana Giménez", profession: "gineco-obstetra" };
const TEXT = "Entre las semanas 24 y 28 se hace la curva de glucosa.";

const registryFor = (text: string, reviewerId = ANA.id): ApprovalRegistry => ({
  reviewers: [ANA],
  approvals: [
    { contentId: "obstetra:24", reviewerId, reviewedAt: "2026-10-07", contentHash: contentHash(text) },
  ],
});

describe("what an approval pins", () => {
  it("ignores reflowing but not a changed word", () => {
    expect(normalizeClinicalText("  uno\r\n dos\t\ttres \n")).toBe("uno dos tres");
    expect(contentHash("uno\n dos")).toBe(contentHash("uno dos"));
    expect(contentHash("uno dos")).not.toBe(contentHash("uno tres"));
  });

  it("covers every clinical field of a food entry", () => {
    const entry = { name: "Tereré", verdict: "precaucion", reason: "Cafeína.", detail: "1–2 termos." };
    const base = contentHash(foodClinicalText(entry));
    expect(contentHash(foodClinicalText({ ...entry, verdict: "si" }))).not.toBe(base);
    expect(contentHash(foodClinicalText({ ...entry, detail: "3 termos." }))).not.toBe(base);
  });
});

describe("approvalStatus / reviewFor", () => {
  it("shows the approver for the exact approved text", () => {
    expect(reviewFor(registryFor(TEXT), "obstetra:24", TEXT)).toEqual({
      reviewerName: "Dra. Ana Giménez",
      profession: "gineco-obstetra",
      reviewedAt: "2026-10-07",
    });
  });

  it("shows nothing for another item, an edited text or an unknown reviewer", () => {
    expect(reviewFor(registryFor(TEXT), "obstetra:25", TEXT)).toBeNull();
    expect(approvalStatus(registryFor(TEXT), "obstetra:24", `${TEXT} Ahora más.`).status).toBe("stale");
    expect(approvalStatus(registryFor(TEXT, "otra-persona"), "obstetra:24", TEXT).status).toBe(
      "unknown-reviewer",
    );
    expect(reviewFor({ reviewers: [ANA], approvals: [] }, "obstetra:24", TEXT)).toBeNull();
  });
});

describe("approvalProblems (npm run validate:content)", () => {
  it("passes an empty registry and unclaimed content", () => {
    expect(
      approvalProblems({ reviewers: [], approvals: [] }, [{ contentId: "obstetra:24", text: TEXT }]),
    ).toEqual({ errors: [], stale: [] });
  });

  it("rejects a reviewedBy claim by somebody who is not a registered reviewer", () => {
    const { errors } = approvalProblems({ reviewers: [ANA], approvals: [] }, [
      { contentId: "guia:x", text: "<p>x</p>", claimedReviewer: "Equipo médico de Mi Bebé" },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/no es un revisor registrado/);
  });

  it("rejects a registered reviewer's claim with no current approval behind it", () => {
    const { errors } = approvalProblems({ reviewers: [ANA], approvals: [] }, [
      { contentId: "food:food-terere", text: "x", claimedReviewer: ANA.name },
    ]);
    expect(errors[0]).toMatch(/no hay una aprobación vigente/);
  });

  it("rejects approvals of content that does not exist or by unknown reviewers", () => {
    const { errors } = approvalProblems(registryFor(TEXT, "nadie"), []);
    expect(errors.some((e) => /no está en lib\/seed\/reviewers.json/.test(e))).toBe(true);
    expect(errors.some((e) => /no existe ningún contenido/.test(e))).toBe(true);
  });

  it("lists a stale approval as a warning with the hash it now expects", () => {
    const edited = `${TEXT} Editado.`;
    const result = approvalProblems(registryFor(TEXT), [{ contentId: "obstetra:24", text: edited }]);
    expect(result.errors).toEqual([]);
    expect(result.stale).toHaveLength(1);
    expect(result.stale[0]).toContain(contentHash(edited));
  });

  it("accepts a claim backed by the claimant's current approval", () => {
    const registry: ApprovalRegistry = {
      reviewers: [ANA],
      approvals: [
        { contentId: "food:food-terere", reviewerId: ANA.id, reviewedAt: "2026-10-07", contentHash: contentHash("x") },
      ],
    };
    expect(
      approvalProblems(registry, [{ contentId: "food:food-terere", text: "x", claimedReviewer: ANA.name }]),
    ).toEqual({ errors: [], stale: [] });
  });
});

describe("formatReviewDate", () => {
  it("spells the date the same on the server and in the browser", () => {
    expect(formatReviewDate("2026-10-07")).toBe("7 de octubre de 2026");
    expect(formatReviewDate("2027-01-31")).toBe("31 de enero de 2027");
  });
});
