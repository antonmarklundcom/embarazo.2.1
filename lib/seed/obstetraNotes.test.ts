import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PUBLISHED_OBSTETRA_NOTES,
  approvedObstetraNote,
  obstetraNote,
} from "./obstetraNotes";
import { ObstetraNoteSchema } from "../content/schemas";
import { contentHash, obstetraContentId, type ApprovalRegistry } from "../content/approvals";

// BUILD-PLAN C5. The content tests are ordinary; the one that matters is the
// last block, which asserts that this card cannot render without a named
// reviewer's approval of that week's exact text (F22). That is the whole
// feature — an unsigned "de la obstetra" card is the app claiming authority it
// does not have, on prenatal advice.

describe("the notes", () => {
  it("covers every week, once each", () => {
    const weeks = PUBLISHED_OBSTETRA_NOTES.map((entry) => entry.week);
    expect(weeks).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
  });

  it("says something different every week", () => {
    const notes = PUBLISHED_OBSTETRA_NOTES.map((entry) => entry.note);
    expect(new Set(notes).size).toBe(notes.length);
  });

  it("returns null outside the pregnancy", () => {
    expect(obstetraNote(0)).toBeNull();
    expect(obstetraNote(43)).toBeNull();
  });

  it("puts the Paraguayan prenatal calendar where it belongs", () => {
    // These are the fixed windows a translated global app gets wrong, and the
    // reason this content is worth writing at all. Each is asserted at the week
    // a user would look it up.
    expect(obstetraNote(11)).toContain("translucencia nucal");
    expect(obstetraNote(18)).toContain("morfológica");
    expect(obstetraNote(24)).toContain("glucosa");
    expect(obstetraNote(27)).toContain("dTpa");
    expect(obstetraNote(35)).toContain("estreptococo");
    expect(obstetraNote(13)).toContain("carné perinatal");
  });

  it("names the alarm signs at the weeks they matter", () => {
    expect(obstetraNote(26)!.toLowerCase()).toContain("preeclampsia");
    expect(obstetraNote(30)!.toLowerCase()).toContain("movimientos");
    expect(obstetraNote(37)!.toLowerCase()).toContain("contracciones");
  });

  it("keeps a note to something readable on a phone", () => {
    for (const entry of PUBLISHED_OBSTETRA_NOTES) {
      expect(
        ObstetraNoteSchema.safeParse(entry).success,
        `semana ${entry.week}`,
      ).toBe(true);
    }
  });
});

describe("the approval is the gate (F22)", () => {
  const ANA = { id: "ana-gimenez", name: "Dra. Ana Giménez", profession: "gineco-obstetra" };
  const approve = (week: number, text: string): ApprovalRegistry => ({
    reviewers: [ANA],
    approvals: [
      {
        contentId: obstetraContentId(week),
        reviewerId: ANA.id,
        reviewedAt: "2026-10-07",
        contentHash: contentHash(text),
      },
    ],
  });

  it("renders no week from the shipped registry", () => {
    // Nothing has been professionally reviewed yet, so nothing is signed —
    // whatever NEXT_PUBLIC_MEDICAL_REVIEWER says (the card no longer reads it).
    for (let week = 1; week <= 42; week++) {
      expect(approvedObstetraNote(week), `semana ${week}`).toBeNull();
    }
  });

  it("does not unlock any week for a reviewer with no approvals", () => {
    const registered: ApprovalRegistry = { reviewers: [ANA], approvals: [] };
    for (let week = 1; week <= 42; week++) {
      expect(approvedObstetraNote(week, registered)).toBeNull();
    }
  });

  it("unlocks exactly the approved week, signed by whoever approved it", () => {
    const registry = approve(20, obstetraNote(20)!);
    const shown = approvedObstetraNote(20, registry);
    expect(shown?.note).toBe(obstetraNote(20));
    expect(shown?.review).toEqual({
      reviewerName: "Dra. Ana Giménez",
      profession: "gineco-obstetra",
      reviewedAt: "2026-10-07",
    });
    const others = Array.from({ length: 42 }, (_, i) => i + 1).filter((w) => w !== 20);
    expect(others.filter((w) => approvedObstetraNote(w, registry) !== null)).toEqual([]);
  });

  it("hides a note again when its text changes after the approval", () => {
    const registry = approve(20, `${obstetraNote(20)} Una frase agregada después.`);
    expect(approvedObstetraNote(20, registry)).toBeNull();
  });

  it("has no fallback byline anywhere in the card", () => {
    // Z2 removed exactly this from `MedicalReviewByline`: a generic "el equipo
    // médico de Mi Bebé" is a claim that review happened. Asserted against the
    // source, because the failure is something a future edit *adds*.
    const source = readFileSync(
      join(process.cwd(), "components", "ObstetraCard.tsx"),
      "utf8",
    );
    // Comments stripped first, so the comment *explaining* this rule does not
    // trip it — only code counts.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).toContain("approvedObstetraNote");
    expect(code).not.toContain("NEXT_PUBLIC_MEDICAL_REVIEWER");
    expect(code.toLowerCase()).not.toContain("equipo médico");
    // No literal author string: the name can only come from an approval.
    expect(code).not.toMatch(/"Dra?\.|"Lic\./);
  });
});
