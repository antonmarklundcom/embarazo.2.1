import { useState } from "react";

import { db, type Role } from "@/lib/db";
import { ROLE_ONBOARDING_COPY, ROLE_ORDER } from "@/lib/roleCopy";

// W4: the relationship role (B1), moved verbatim out of AjustesClient.
// Editable, per feature map #1's "editable later".
export function RoleSettings({ role }: { role: Role }) {
  const [roleMsg, setRoleMsg] = useState("");

  async function switchRole(next: Role) {
    if (next === role) return;
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    await db().profile.update(first.id, { role: next });
    setRoleMsg(`Guardado: ${ROLE_ONBOARDING_COPY[next].title}.`);
    setTimeout(() => setRoleMsg(""), 3500);
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">¿Cómo te describís vos?</h2>
      <p className="mt-1 text-sm text-muted">
        Ajusta cómo te habla la app. No cambia tus datos.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchRole(r)}
            aria-pressed={role === r}
            className={`min-h-[44px] rounded-tile border px-3 py-2.5 text-sm font-medium transition ${
              role === r
                ? "border-petrol bg-petrol text-white"
                : "border-black/10 bg-cream text-ink"
            }`}
          >
            {ROLE_ONBOARDING_COPY[r].title}
          </button>
        ))}
      </div>
      {roleMsg && <p className="mt-2 text-sm text-sage">{roleMsg}</p>}
    </section>
  );
}
