import { useState } from "react";

import { db, type AppMode, type Profile, type Role } from "@/lib/db";
import { WORK_SITUATIONS, type WorkSituation } from "@/lib/derechos";
import {
  CARE_SETTINGS,
  type CareSetting,
} from "@/lib/onboarding/personalisation";

// W4: "Tu situación" — K9-F5's three onboarding answers — moved verbatim out
// of AjustesClient with its writer and the two row/pill helpers only it used.
//
// `mode`/`role` gate this card from inside rather than at the call site, the
// same way every other conditional card in this folder does: the message state
// then survives a mode switch exactly as it did when it was a `useState` in
// AjustesClient.
export function SituationSettings({
  mode,
  role,
  firstPregnancy,
  careSetting,
  workSituation,
}: {
  mode: AppMode;
  role: Role;
  firstPregnancy: boolean | undefined;
  careSetting: CareSetting | undefined;
  workSituation: WorkSituation | undefined;
}) {
  const [situationMsg, setSituationMsg] = useState("");

  /**
   * K9-F5 — change one of the three onboarding answers.
   *
   * Writes on tap, with no "Guardar": each is a single choice out of a closed
   * set, and a woman who taps "trabajo sin IPS" and leaves the screen has said
   * what she meant. `null` clears the field back to unanswered, which is a
   * real state — `lib/onboarding/personalisation.ts` treats absent as "she did
   * not say" everywhere, never as a default.
   */
  async function saveSituation(patch: {
    firstPregnancy?: boolean | null;
    careSetting?: CareSetting | null;
    workSituation?: WorkSituation | null;
  }) {
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    // Dexie's `update` deletes a key set to `undefined`, which is exactly what
    // clearing an answer has to do: leaving `false` behind would say "no, it is
    // not my first" on behalf of somebody who withdrew the answer. Spelled out
    // one key at a time rather than mapped, so `undefined` reaches Dexie with
    // the field's own type on it.
    const fields: Partial<Profile> = {};
    if ("firstPregnancy" in patch) {
      fields.firstPregnancy = patch.firstPregnancy ?? undefined;
    }
    if ("careSetting" in patch) fields.careSetting = patch.careSetting ?? undefined;
    if ("workSituation" in patch) {
      fields.workSituation = patch.workSituation ?? undefined;
    }
    await db().profile.update(first.id, fields);
    setSituationMsg("Guardado.");
    setTimeout(() => setSituationMsg(""), 2500);
  }

  /* K9-F5 — the three onboarding answers, changeable forever. A question
     asked once during first run that could never be corrected would be
     worse than not asking: "trabajo sin IPS" today is "trabajo y aporto"
     next month, and a first pregnancy is only ever a first one once. */
  if (mode !== "embarazada" || role !== "mama") return null;

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Tu situación</h2>
      <p className="mt-1 text-sm text-muted">
        Ajusta tus derechos, tu checklist y las guías que te mostramos. Queda
        en tu teléfono y podés dejarlo sin responder.
      </p>

      <SituationRow label="¿Es tu primer embarazo?">
        <SituationPill
          label="Sí"
          selected={firstPregnancy === true}
          onClick={() => void saveSituation({ firstPregnancy: true })}
        />
        <SituationPill
          label="No"
          selected={firstPregnancy === false}
          onClick={() => void saveSituation({ firstPregnancy: false })}
        />
        <SituationPill
          label="Prefiero no decir"
          selected={firstPregnancy === undefined}
          onClick={() => void saveSituation({ firstPregnancy: null })}
        />
      </SituationRow>

      <SituationRow label="¿Dónde te atendés?">
        {CARE_SETTINGS.map((setting) => (
          <SituationPill
            key={setting.key}
            label={setting.label}
            selected={careSetting === setting.key}
            onClick={() => void saveSituation({ careSetting: setting.key })}
          />
        ))}
        <SituationPill
          label="Todavía no sé"
          selected={careSetting === undefined}
          onClick={() => void saveSituation({ careSetting: null })}
        />
      </SituationRow>

      <SituationRow label="¿Trabajás?">
        {WORK_SITUATIONS.map((situation) => (
          <SituationPill
            key={situation.key}
            label={situation.label}
            selected={workSituation === situation.key}
            onClick={() => void saveSituation({ workSituation: situation.key })}
          />
        ))}
        <SituationPill
          label="Prefiero no decir"
          selected={workSituation === undefined}
          onClick={() => void saveSituation({ workSituation: null })}
        />
      </SituationRow>

      {situationMsg && <p className="mt-3 text-sm text-sage">{situationMsg}</p>}
    </section>
  );
}

/** K9-F5 — one question in the "Tu situación" section. */
function SituationRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-extrabold text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function SituationPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[44px] rounded-tile border px-3 text-sm font-semibold transition active:scale-[0.98] ${
        selected
          ? "border-petrol bg-petrol text-white"
          : "border-black/10 bg-cream text-ink"
      }`}
    >
      {label}
    </button>
  );
}
