import { isPlaceholderRecord, isUnreviewed } from "@/lib/seed/gate";

// FABLE-PLAN §5 D4 — the review-debt report, pure half.
//
// D4 settled that **content stays in git**: no editor role, no CMS, no
// second privileged human. Build-time validation (G1) and offline precache are
// the point, and a CMS-backed article can have neither. What D4 also promised
// was "a read-only `/admin/contenido` review-debt page in a later batch", and
// this is its arithmetic.
//
// The page it feeds answers one question: **what is the app hiding, and why?**
//
// Roughly a fifth of the navigation renders an empty state today. That is the
// gates working — `publishedOnly` hides invented sanatorios with dead +595
// numbers, `reviewedOnly` hides prices nobody has signed off — but the gates
// are silent, and silence is exactly the wrong feedback for the founder task
// they are waiting on. "Directorio: 0 de 12 publicados, 12 esperan datos
// reales" is a to-do list; an empty screen is a bug report about nothing.
//
// It is deliberately **read-only and derived**. There is no button here, no
// approve, no override — the way an entry lights up is that somebody edits the
// JSON in git and it stops looking like a placeholder. A page that could
// publish content would be the editor role D4 declined, arriving through the
// back door.

export type DebtGate = "placeholder" | "unreviewed" | "both";

export interface CollectionDebt {
  /** What the founder calls it. */
  label: string;
  /** Where it renders in the app, so the report says what stays dark. */
  surface: string;
  /** The file to edit. */
  file: string;
  total: number;
  published: number;
  /** Hidden because a name, phone or source still says "placeholder". */
  placeholder: number;
  /** Hidden because no reviewer has signed it off. */
  unreviewed: number;
  /** Hidden by both gates at once — prices ship this way on purpose. */
  both: number;
  /** Which gates this collection applies at all. */
  gates: DebtGate;
}

export interface CollectionInput {
  label: string;
  surface: string;
  file: string;
  entries: readonly unknown[];
  gates: DebtGate;
}

/**
 * Count one collection, by the same functions the gates themselves use.
 *
 * Reusing `isPlaceholderRecord` and `isUnreviewed` rather than re-deriving
 * "looks unfinished" is the whole reliability argument for this page: a report
 * with its own idea of what is hidden would drift from the app on the first
 * change to either gate, and the drift would be silent in the direction that
 * matters — the page saying "published" about something no user can see.
 */
export function summariseCollection(input: CollectionInput): CollectionDebt {
  let placeholder = 0;
  let unreviewed = 0;
  let both = 0;
  let published = 0;

  const checksPlaceholder = input.gates !== "unreviewed";
  const checksReview = input.gates !== "placeholder";

  for (const entry of input.entries) {
    const isPlaceholder = checksPlaceholder && isPlaceholderRecord(entry);
    const isPending =
      checksReview && isUnreviewed((entry ?? {}) as { reviewedBy?: string });

    if (isPlaceholder && isPending) both += 1;
    else if (isPlaceholder) placeholder += 1;
    else if (isPending) unreviewed += 1;
    else published += 1;
  }

  return {
    label: input.label,
    surface: input.surface,
    file: input.file,
    total: input.entries.length,
    published,
    placeholder,
    unreviewed,
    both,
    gates: input.gates,
  };
}

/** Everything hidden, across every collection. */
export function totalHidden(rows: readonly CollectionDebt[]): number {
  return rows.reduce(
    (sum, row) => sum + row.placeholder + row.unreviewed + row.both,
    0,
  );
}

/** Collections with nothing to show, worst first — the founder's to-do list. */
export function sortedByDebt(rows: readonly CollectionDebt[]): CollectionDebt[] {
  const hidden = (row: CollectionDebt) => row.placeholder + row.unreviewed + row.both;
  return [...rows].sort(
    (a, b) =>
      // Fully dark collections first: a surface with nothing on it is a worse
      // problem than one missing three of twenty entries.
      Number(a.published > 0) - Number(b.published > 0) ||
      hidden(b) - hidden(a) ||
      a.label.localeCompare(b.label),
  );
}

/** One-line explanation of what has to happen for a row to light up. */
export function debtAction(row: CollectionDebt): string {
  if (row.placeholder + row.unreviewed + row.both === 0) {
    return "Nada pendiente.";
  }
  if (row.both > 0) {
    return "Faltan datos reales y la revisión médica.";
  }
  if (row.unreviewed > 0 && row.placeholder > 0) {
    return "Faltan datos reales en unos, y la revisión médica en otros.";
  }
  if (row.unreviewed > 0) {
    return "Falta que la revisora médica los firme.";
  }
  return "Faltan datos reales: nombre, teléfono o fuente.";
}
