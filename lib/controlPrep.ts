// "Preparar mi control" — what she brings to her next prenatal control.
//
// Two halves, both pure so they are testable without a browser:
//
//   1. **Questions to ask, for her week.** Phrased as questions she asks her
//      médico/a, never as answers — the app does not tell her what her tests
//      will say or what is normal, it helps her not forget to ask. Week
//      ranges follow common prenatal practice and are flagged for the medical
//      reviewer with the rest of the clinical copy (docs/REVIEW-2026-09-23.md).
//   2. **The last four weeks of her own logs,** condensed to what a doctor can
//      read in ten seconds: weight change, the symptoms she noted most, low
//      mood days, kick sessions, contractions. Organised, never interpreted.
//
// Her picks and her own questions stay on this device (`mibebe.control.*`,
// cleared by "Borrar todos mis datos" in `lib/db.ts`).

import type { ContractionEntry, JournalEntry, KickSession, WeightEntry } from "@/lib/db";

export interface ControlQuestion {
  id: string;
  /** Friendly week range (1-based, as on /semana/N), inclusive. */
  from: number;
  to: number;
  text: string;
}

export const CONTROL_QUESTIONS: readonly ControlQuestion[] = [
  // Any week.
  { id: "g-sintomas", from: 1, to: 42, text: "Anoté algunos síntomas: ¿son esperables en esta etapa o hay que controlarlos?" },
  { id: "g-remedios", from: 1, to: 42, text: "¿Puedo seguir tomando los remedios o suplementos que tomo ahora?" },
  { id: "g-proximo", from: 1, to: 42, text: "¿Cuándo es mi próximo control y qué estudios tengo que llevar?" },
  { id: "g-alarma", from: 1, to: 42, text: "¿Qué señales me tienen que hacer ir a la guardia sin esperar al control?" },
  // Primer trimestre.
  { id: "t1-suplementos", from: 1, to: 13, text: "¿Qué vitaminas o suplementos tengo que tomar, y hasta cuándo?" },
  { id: "t1-analisis", from: 1, to: 13, text: "¿Qué análisis de sangre y orina me tocan al inicio del embarazo?" },
  { id: "t1-eco", from: 6, to: 14, text: "¿Cuándo me hago la ecografía del primer trimestre (entre la semana 11 y 14)?" },
  { id: "t1-nauseas", from: 4, to: 16, text: "Tengo náuseas o vómitos: ¿qué puedo hacer, y cuándo ya es demasiado?" },
  // Segundo trimestre.
  { id: "t2-morfologica", from: 15, to: 24, text: "¿Cuándo me hago la ecografía morfológica (alrededor de la semana 20 a 24)?" },
  { id: "t2-glucosa", from: 20, to: 30, text: "¿Cuándo me hago el estudio del azúcar (curva de glucosa)?" },
  { id: "t2-vacunas", from: 14, to: 36, text: "¿Qué vacunas me tocan durante el embarazo y cuándo?" },
  { id: "t2-movimientos", from: 16, to: 28, text: "¿Desde cuándo tengo que sentir los movimientos del bebé, y cuántos son normales?" },
  { id: "t2-trabajo", from: 20, to: 34, text: "¿Qué certificado necesito para el permiso de maternidad y desde cuándo?" },
  // Tercer trimestre.
  { id: "t3-lugar", from: 28, to: 38, text: "¿Dónde voy a tener el parto y qué tengo que hacer para registrarme ahí?" },
  { id: "t3-via", from: 28, to: 40, text: "¿Parto normal o cesárea: qué me recomiendan en mi caso y por qué?" },
  { id: "t3-contracciones", from: 28, to: 40, text: "¿Cómo distingo las contracciones de práctica de las del trabajo de parto?" },
  { id: "t3-estreptococo", from: 33, to: 38, text: "¿Cuándo me hacen el cultivo de estreptococo (entre la semana 35 y 37)?" },
  { id: "t3-lactancia", from: 30, to: 42, text: "¿Qué puedo preparar desde ahora para dar el pecho?" },
  // A término.
  { id: "t4-cuando-ir", from: 36, to: 42, text: "¿En qué momento tengo que salir para el hospital o sanatorio?" },
  { id: "t4-despues-40", from: 38, to: 42, text: "¿Qué pasa si llego a la semana 40 o 41 sin contracciones?" },
  { id: "t4-documentos", from: 36, to: 42, text: "¿Qué documentos y cosas tengo que llevar el día del parto?" },
];

/** The questions for her week, stage-specific first, then the general ones. */
export function questionsForWeek(week: number): ControlQuestion[] {
  const matching = CONTROL_QUESTIONS.filter((q) => week >= q.from && week <= q.to);
  const general = matching.filter((q) => q.id.startsWith("g-"));
  const specific = matching.filter((q) => !q.id.startsWith("g-"));
  return [...specific, ...general];
}

// ---------------------------------------------------------------------------
// The last four weeks
// ---------------------------------------------------------------------------

export const RECENT_DAYS = 28;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RecentSummary {
  /** First and last weight inside the window, when there are at least two. */
  weight: { from: number; to: number; diff: number } | null;
  /** The symptoms she noted most, most frequent first (at most five). */
  topSymptoms: [string, number][];
  /** Days she logged "mal" or "muy mal". */
  lowMoodDays: number;
  kickSessions: number;
  contractions: number;
  /** True when nothing at all was logged in the window. */
  empty: boolean;
}

export function summarizeRecent(
  data: {
    weights: WeightEntry[];
    journal: JournalEntry[];
    kicks: KickSession[];
    contractions: ContractionEntry[];
  },
  now: number,
  days: number = RECENT_DAYS,
): RecentSummary {
  const since = now - days * MS_PER_DAY;

  const weights = data.weights
    .filter((w) => w.date >= since && w.date <= now)
    .sort((a, b) => a.date - b.date);
  const weight =
    weights.length >= 2
      ? {
          from: weights[0]!.kg,
          to: weights[weights.length - 1]!.kg,
          diff: Math.round((weights[weights.length - 1]!.kg - weights[0]!.kg) * 10) / 10,
        }
      : null;

  const journal = data.journal.filter((e) => e.createdAt >= since && e.createdAt <= now);
  const counts = new Map<string, number>();
  for (const entry of journal) {
    for (const symptom of entry.symptoms) counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
  }
  const topSymptoms = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, 5);

  const lowDays = new Set<string>();
  for (const entry of journal) {
    if (entry.mood === "mal" || entry.mood === "muy_mal") {
      const d = new Date(entry.createdAt);
      lowDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }

  const kickSessions = data.kicks.filter((k) => k.startedAt >= since && k.startedAt <= now).length;
  const contractions = data.contractions.filter(
    (c) => c.startedAt >= since && c.startedAt <= now,
  ).length;

  return {
    weight,
    topSymptoms,
    lowMoodDays: lowDays.size,
    kickSessions,
    contractions,
    empty:
      weights.length === 0 && journal.length === 0 && kickSessions === 0 && contractions === 0,
  };
}

// ---------------------------------------------------------------------------
// Her picks and her own questions (this device only)
// ---------------------------------------------------------------------------

export const CONTROL_STORAGE_KEY = "mibebe.control.questions";
/** Her own questions are short notes, not a journal. */
export const MAX_OWN_QUESTIONS = 12;
export const MAX_QUESTION_LENGTH = 200;

export interface ControlPicks {
  picked: string[];
  own: string[];
}

const EMPTY: ControlPicks = { picked: [], own: [] };

/** Narrow whatever is stored to a valid `ControlPicks`. */
export function parsePicks(raw: string | null): ControlPicks {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<ControlPicks>;
    const known = new Set(CONTROL_QUESTIONS.map((q) => q.id));
    return {
      picked: Array.isArray(value.picked)
        ? value.picked.filter((id): id is string => typeof id === "string" && known.has(id))
        : [],
      own: Array.isArray(value.own)
        ? value.own
            .filter((q): q is string => typeof q === "string" && q.trim() !== "")
            .map((q) => q.slice(0, MAX_QUESTION_LENGTH))
            .slice(0, MAX_OWN_QUESTIONS)
        : [],
    };
  } catch {
    return EMPTY;
  }
}

export function readPicks(): ControlPicks {
  try {
    return parsePicks(window.localStorage.getItem(CONTROL_STORAGE_KEY));
  } catch {
    return EMPTY;
  }
}

export function writePicks(picks: ControlPicks): void {
  try {
    window.localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(picks));
  } catch {
    // Private mode: the list lives for this visit only.
  }
}
