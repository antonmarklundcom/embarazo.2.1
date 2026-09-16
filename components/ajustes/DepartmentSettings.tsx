import { useEffect, useState } from "react";

import { db } from "@/lib/db";
import { DEPARTMENTS } from "@/lib/departments";

// W4: "Tu departamento", moved verbatim out of AjustesClient with the select's
// own draft value, the effect that seeds it from the profile, and its writer.
export function DepartmentSettings({
  profileDepartment,
}: {
  profileDepartment: string | undefined;
}) {
  const [department, setDepartment] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (profileDepartment) setDepartment(profileDepartment);
  }, [profileDepartment]);

  async function saveDepartment() {
    const row = await db().profile.toArray();
    const first = row[0];
    if (first?.id) {
      await db().profile.update(first.id, { department });
      setSavedMsg("Departamento actualizado.");
      setTimeout(() => setSavedMsg(""), 2500);
    }
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Tu departamento</h2>
      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 focus:border-petrol focus:outline-none"
      >
        {DEPARTMENTS.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={saveDepartment}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Guardar
      </button>
      {savedMsg && <p className="mt-2 text-sm text-sage">{savedMsg}</p>}
    </section>
  );
}
