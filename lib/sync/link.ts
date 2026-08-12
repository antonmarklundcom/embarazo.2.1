// BUILD-PLAN A6 — linking a device's local data to an account.
//
// The happy path was already true when A3 landed: a local-only user's rows are
// all `dirty = 1` (nothing has ever been accepted by a server), and singleton
// stores share a fixed record id, so signing in pushes everything exactly once
// and merges rather than duplicating. What A3 did NOT have is any notion of
// *which* account the local data belongs to, and that gap is not cosmetic:
//
//   sign in as A → sync → sign out → keep using the app → sign in as B
//
// Every row touched between the two sign-ins is dirty, and without this file
// they would be pushed straight into account B. That is one person's health
// data landing in another person's account, reachable in two taps from
// Ajustes. The guard below is the reason this task is more than a test.

export type LinkDecision =
  /** First link: local data has never been synced. Upload it. */
  | "adopt"
  /** Same account as last time. Business as usual. */
  | "continue"
  /** A different account. Push nothing and say so. */
  | "refuse";

/**
 * Decide what to do when the server tells us which account this session is.
 *
 * @param stored  the account this device's data was last synced with, if any
 * @param current the account the session belongs to now
 */
export function decideAccountLink(
  stored: string | null | undefined,
  current: string,
): LinkDecision {
  if (!stored) return "adopt";
  return stored === current ? "continue" : "refuse";
}

/**
 * The es-PY explanation for a refusal, kept next to the rule that produces it.
 *
 * Deliberately does not name the other account: the person holding the phone
 * may not be the person who owns that data.
 */
export const ACCOUNT_MISMATCH_MESSAGE =
  "Los datos guardados en este teléfono son de otra cuenta, así que no los " +
  "subimos a esta. Podés seguir usándolos acá sin problema. Si querés " +
  "empezar de cero en esta cuenta, borrá los datos del teléfono desde " +
  "Ajustes; si son tuyos, volvé a entrar con la cuenta de antes.";
