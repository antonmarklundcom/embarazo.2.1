// BUILD-PLAN I5 (flag half) / U1 — the vocabulary of runtime flags.
//
// Pure and dependency-free, like `lib/admin/audit.ts` and for the same reason:
// the keys, their scopes and their defaults have to be assertable in a unit
// test without dragging `lib/server/*` (and therefore mysql2 and next-auth)
// into the test runner, and the client hook has to be able to import the
// defaults without importing anything that touches a database.
//
// Two properties of this list are structural rather than stylistic:
//
//   1. **Adding a key is a decision, not a detail.** `flags.test.ts` pins this
//      list, so a new flag cannot appear without someone noticing — the same
//      shape `ADMIN_ACTIONS` uses. A flag is a branch in production behaviour
//      that no deploy records.
//   2. **Scope is part of the key, not of the call site.** A `server` flag is
//      never in the response of `GET /api/v1/flags`, and that is enforced by
//      the key's own declaration rather than by each reader remembering to
//      filter. `ai_baby_paused` says something about the founder's spending;
//      it is nobody's business on a phone.

/** What a flag is allowed to reach. */
export type FlagScope = "server" | "client";

export interface FlagDefinition {
  /** `client` flags are published by `GET /api/v1/flags`; `server` ones never are. */
  scope: FlagScope;
  /** The value with no row in the database, and the value on any failure. */
  default: boolean;
  /** Shown on `/admin/flags`. es-PY, addressed to the founder. */
  description: string;
}

/**
 * Every runtime flag. Pinned by `lib/flags/keys.test.ts`.
 *
 * The defaults are all `false` and that is not a coincidence: a flag store
 * that cannot be read (no database, a query that threw, a cold process) must
 * fall back to the *quieter* app, never to a surface nobody has approved and
 * never to spending money.
 */
export const FLAG_DEFINITIONS = {
  // I4/U2 wires this into `lib/server/aiBaby.ts`. ONE-DIRECTIONAL: see the
  // header of `lib/server/flags.ts`. `true` adds a stop; it can never start
  // anything, because `AI_BABY_ENABLED=true` remains the master switch.
  ai_baby_paused: {
    scope: "server",
    default: false,
    description:
      "Pausa la generación de imágenes con IA. No la enciende: para eso sigue " +
      "haciendo falta AI_BABY_ENABLED=true en el servidor.",
  },
  // E4/U3's rail. Client-visible because the surface it gates is on the phone.
  recomendados: {
    scope: "client",
    default: false,
    description:
      "Muestra el riel de Recomendados. Apagado hasta que haya recomendaciones " +
      "reales cargadas.",
  },
} as const satisfies Record<string, FlagDefinition>;

export type FlagKey = keyof typeof FLAG_DEFINITIONS;

/** Every key, in a stable order. `Object.keys` typed. */
export const FLAG_KEYS = Object.keys(FLAG_DEFINITIONS).sort() as FlagKey[];

/** The keys `GET /api/v1/flags` may publish. */
export const CLIENT_FLAG_KEYS = FLAG_KEYS.filter(
  (key) => FLAG_DEFINITIONS[key].scope === "client",
);

export type FlagValues = Record<FlagKey, boolean>;
export type ClientFlagValues = Partial<Record<FlagKey, boolean>>;

/** Narrow an untrusted string — a form field, a query key — to a known flag. */
export function isFlagKey(value: unknown): value is FlagKey {
  return typeof value === "string" && Object.hasOwn(FLAG_DEFINITIONS, value);
}

/** Every flag at its default. The answer with no database, and on any error. */
export function defaultFlags(): FlagValues {
  const out = {} as FlagValues;
  for (const key of FLAG_KEYS) out[key] = FLAG_DEFINITIONS[key].default;
  return out;
}

/** The client-scope subset of a full set of values. */
export function clientScope(values: FlagValues): ClientFlagValues {
  const out: ClientFlagValues = {};
  for (const key of CLIENT_FLAG_KEYS) out[key] = values[key];
  return out;
}

/**
 * Fold stored rows onto the defaults.
 *
 * Pure so the merge — the part with the interesting failure modes: an unknown
 * key left over from a removed feature, a null from a column that was widened,
 * a duplicate row — is unit-testable without a database. An unknown key is
 * ignored rather than thrown on: a flag removed in a deploy leaves its row
 * behind, and that must not take the whole store down with it.
 */
export function mergeFlagRows(
  rows: readonly { key: string; value: boolean | number | null }[],
): FlagValues {
  const values = defaultFlags();
  for (const row of rows) {
    if (!isFlagKey(row.key)) continue;
    if (row.value === null) continue;
    values[row.key] = Boolean(row.value);
  }
  return values;
}
