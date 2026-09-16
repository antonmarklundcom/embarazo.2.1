import { useEffect, useState } from "react";

import { db, type AppMode, type BabyIdentity } from "@/lib/db";

// W4: "Nombre de tu bebé" (B2, twins and more), moved verbatim out of
// AjustesClient with its local editable copy of the names, the effect that
// seeds it, and its writer. Gate inside — see PregnancyDateSettings.
export function BabyNamesSettings({
  mode,
  babies,
}: {
  mode: AppMode;
  babies: BabyIdentity[];
}) {
  // Baby identity / twins (B2). Local editable copy of profile.babies names.
  const [babyNames, setBabyNames] = useState<string[]>([""]);
  const [babyMsg, setBabyMsg] = useState("");

  useEffect(() => {
    if (babies.length > 0) {
      setBabyNames(babies.map((b) => b.name ?? ""));
    }
  }, [babies]);

  async function saveBabyNames() {
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    const next: BabyIdentity[] = babyNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
      .map((name) => ({ name }));
    await db().profile.update(first.id, { babies: next });
    setBabyMsg("Guardado.");
    setTimeout(() => setBabyMsg(""), 2500);
  }

  function addBabyNameField() {
    setBabyNames((names) => [...names, ""]);
  }

  function removeBabyNameField(index: number) {
    setBabyNames((names) => names.filter((_, i) => i !== index));
  }

  if (mode !== "embarazada") return null;

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Nombre de tu bebé</h2>
      <p className="mt-1 text-sm text-muted">
        Lo usamos para personalizar la app. Si son mellizos o más, agregá un
        nombre por cada uno.
      </p>
      <div className="mt-3 space-y-2">
        {babyNames.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) =>
                setBabyNames((names) =>
                  names.map((n, j) => (j === i ? e.target.value : n)),
                )
              }
              placeholder={i === 0 ? "Ej: Silvia" : `Bebé ${i + 1}`}
              className="min-h-[44px] flex-1 rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
            />
            {babyNames.length > 1 && (
              <button
                type="button"
                onClick={() => removeBabyNameField(i)}
                aria-label={`Quitar nombre ${i + 1}`}
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile border border-black/10 text-muted"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addBabyNameField}
        className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
      >
        + Agregar otro bebé (mellizos)
      </button>
      <button
        type="button"
        onClick={saveBabyNames}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Guardar
      </button>
      {babyMsg && <p className="mt-2 text-sm text-sage">{babyMsg}</p>}
    </section>
  );
}
