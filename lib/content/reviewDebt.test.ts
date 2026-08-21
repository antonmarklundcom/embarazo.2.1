import { describe, expect, it } from "vitest";

import {
  debtAction,
  sortedByDebt,
  summariseCollection,
  totalHidden,
  type CollectionDebt,
} from "./reviewDebt";
import { publishedOnly, reviewedOnly } from "@/lib/seed/gate";

// §5 D4 — the review-debt arithmetic.
//
// The property that matters is agreement with the gates: this page exists to
// tell the founder what is hidden, and a page that disagrees with the app is
// worse than no page — it would report "publicado" about an entry no user can
// see, and the founder would stop looking for the reason the screen is empty.

const collection = (entries: unknown[], gates: "placeholder" | "unreviewed" | "both") =>
  summariseCollection({
    label: "Prueba",
    surface: "/prueba",
    file: "lib/seed/prueba.json",
    entries,
    gates,
  });

const real = { id: "dir-001", name: "Sanatorio Real", whatsappNumber: "+595971234567" };
const fake = { id: "dir-002", name: "Sanatorio Inventado (placeholder)" };
const deadNumber = { id: "dir-003", name: "Otro", whatsappNumber: "+595981000001" };
const signed = { id: "p-1", name: "Ecografía", reviewedBy: "Dra. X", source: "IPS 2026" };
const unsigned: { id: string; name: string; source: string; reviewedBy?: string } = {
  id: "p-2",
  name: "Parto",
  source: "IPS 2026",
};

describe("agrees with the gates", () => {
  it("counts as published exactly what publishedOnly lets through", () => {
    const entries = [real, fake, deadNumber];
    expect(collection(entries, "placeholder").published).toBe(
      publishedOnly(entries).length,
    );
  });

  it("counts as published exactly what reviewedOnly lets through", () => {
    const entries = [signed, unsigned];
    expect(collection(entries, "unreviewed").published).toBe(
      reviewedOnly(entries).length,
    );
  });

  it("counts as published exactly what both gates let through", () => {
    const entries = [
      signed,
      unsigned,
      { ...signed, id: "p-3", source: "(placeholder)" },
    ];
    expect(collection(entries, "both").published).toBe(
      reviewedOnly(publishedOnly(entries)).length,
    );
  });
});

describe("says why each entry is hidden", () => {
  it("separates a dead phone number from a missing signature", () => {
    const row = collection([real, deadNumber, unsigned, signed], "both");
    expect(row).toMatchObject({
      total: 4,
      // `signed` is the only entry that clears both gates.
      published: 1,
      // Nothing is hidden by the placeholder gate alone: `deadNumber` is
      // unsigned too, so it belongs under `both`.
      placeholder: 0,
      // `real` and `unsigned` carry real data and no signature.
      unreviewed: 2,
      both: 1,
    });
    expect(row.published + row.placeholder + row.unreviewed + row.both).toBe(4);
  });

  it("files an entry hit by both gates under `both`, never twice", () => {
    // Prices ship this way on purpose: invented figures AND unsigned.
    const row = collection([{ source: "(placeholder)" }], "both");
    expect(row.both).toBe(1);
    expect(row.placeholder).toBe(0);
    expect(row.unreviewed).toBe(0);
    expect(row.published + row.placeholder + row.unreviewed + row.both).toBe(row.total);
  });

  it("does not invent a review gate for a collection that has none", () => {
    // The directory has no reviewer — a listing with real data is published,
    // and reporting it as "waiting on the doctor" would send the founder
    // chasing the wrong person.
    const row = collection([real], "placeholder");
    expect(row.unreviewed).toBe(0);
    expect(row.published).toBe(1);
  });

  it("survives a null entry rather than throwing the whole page", () => {
    expect(() => collection([null], "both")).not.toThrow();
  });
});

describe("the founder's to-do list", () => {
  const rows: CollectionDebt[] = [
    { label: "Casi lista", surface: "/a", file: "a", total: 10, published: 9, placeholder: 1, unreviewed: 0, both: 0, gates: "placeholder" },
    { label: "Vacía", surface: "/b", file: "b", total: 3, published: 0, placeholder: 3, unreviewed: 0, both: 0, gates: "placeholder" },
    { label: "Lista", surface: "/c", file: "c", total: 5, published: 5, placeholder: 0, unreviewed: 0, both: 0, gates: "placeholder" },
  ];

  it("puts a surface with nothing on it first", () => {
    expect(sortedByDebt(rows).map((r) => r.label)).toEqual([
      "Vacía",
      "Casi lista",
      "Lista",
    ]);
  });

  it("adds every hidden entry up", () => {
    expect(totalHidden(rows)).toBe(4);
  });

  it("names the person who has to act", () => {
    expect(debtAction(rows[1]!)).toContain("datos reales");
    expect(debtAction(rows[2]!)).toBe("Nada pendiente.");
    expect(
      debtAction({ ...rows[0]!, placeholder: 0, unreviewed: 2 }),
    ).toContain("revisora");
    expect(debtAction({ ...rows[0]!, placeholder: 0, both: 2 })).toContain(
      "revisión médica",
    );
  });
});
