"use client";

import { useEffect, useState } from "react";

import {
  LEVEL_FIELDS,
  SHARING_DEFAULTS,
  SHARING_LEVELS,
  type SharingLevel,
  type SharingPreferences,
} from "@/lib/sharing/levels";
import {
  readSharingPreferences,
  saveSharingPreferences,
} from "@/lib/sharing/client";

// BUILD-PLAN K3 — "qué ve tu pareja" (docs/archive/FABLE-PLAN-2026-08.md §3).
//
// Three switches, all off until she turns them on, and each one independent of
// the others. The copy names the *field*, not a vague category, because the
// only useful version of this control is one where she knows exactly what
// changed when she flips it.
//
// This section renders for the owner only, and only ever mentions the pareja.
// `family` is not a weaker partner — it is a different relationship, and the
// server enforces that in `readSnapshotFor` rather than trusting this screen.

const COPY: Partial<
  Record<SharingLevel, { title: string; on: string; off: string; note?: string }>
> = {
  peso: {
    title: "Tu peso",
    on: "Ve tu último peso y de cuándo es.",
    off: "No ve nada de tu peso.",
  },
  pataditas: {
    title: "Las pataditas",
    on: "Ve cuántas contaste la última vez.",
    off: "No ve tus conteos.",
  },
};

// F09 (2026-10 review): the `fotos` switch is not shown. It said "va a verlas
// cuando actives la copia de seguridad" — the copy exists now, and nobody but
// her sees it — and its note said photos never leave the phone. A switch that
// does nothing, described with a promise, is not consent to anything: the
// stored preference stays where it is for old clients, but if photo sharing
// is ever built it must ask again rather than honour this one
// (lib/sharing/levels.ts).
const SHOWN_LEVELS = SHARING_LEVELS.filter((level) => LEVEL_FIELDS[level].length > 0);

export function SharingLevels({ onChanged }: { onChanged?: () => void }) {
  const [prefs, setPrefs] = useState<SharingPreferences | null>(null);
  const [busy, setBusy] = useState<SharingLevel | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readSharingPreferences().then((stored) => {
      if (!cancelled) setPrefs(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = prefs ?? SHARING_DEFAULTS;

  async function toggle(level: SharingLevel) {
    const next = { ...current, [level]: !current[level] };
    setPrefs(next);
    setBusy(level);
    setFailed(false);
    const ok = await saveSharingPreferences(next);
    setBusy(null);
    if (!ok) setFailed(true);
    onChanged?.();
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Qué ve tu pareja</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Además de tu semana, tu fecha probable de parto y tu próximo control,
        podés compartir esto con tu pareja. Solo con tu pareja — la familia no
        lo ve nunca. Todo empieza apagado y lo apagás cuando quieras. Tus
        fotos no se comparten con nadie.
      </p>

      <ul className="mt-3 space-y-2">
        {SHOWN_LEVELS.map((level) => {
          const on = current[level];
          const copy = COPY[level];
          if (!copy) return null;
          return (
            <li key={level}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={busy !== null}
                onClick={() => void toggle(level)}
                className={`flex min-h-[44px] w-full items-start gap-3 rounded-tile border px-3 py-2.5 text-left disabled:opacity-60 ${
                  on
                    ? "border-petrol/30 bg-pastel-salvia"
                    : "border-line bg-cream"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition ${
                    on ? "justify-end bg-petrol" : "justify-start bg-ink/20"
                  }`}
                >
                  <span className="h-5 w-5 rounded-full bg-white" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-ink">
                    {copy.title}
                  </span>
                  <span className="block text-sm font-semibold text-muted">
                    {on ? copy.on : copy.off}
                  </span>
                </span>
              </button>
              {on && copy.note && (
                <p className="mt-1 px-1 text-xs leading-relaxed text-muted">
                  {copy.note}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {failed && (
        <p role="alert" className="mt-2 text-sm font-semibold text-terracotta">
          Guardamos tu elección en el teléfono, pero no pudimos avisarle al
          servidor. Se va a aplicar la próxima vez que abras la app con internet.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Tus notas del diario no se comparten con nadie, nunca, en ninguna
        configuración.
      </p>
    </section>
  );
}
