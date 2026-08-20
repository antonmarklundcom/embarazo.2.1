import { weeklyLine } from "@/lib/seed/weeklyLines";
import { cheerById } from "@/lib/sharing/cheers";

// PR-5b — the two sentences the service worker learned to write.
//
// Pure, so the wording of a notification is testable without a browser, a
// database or a push service. `lib/appointments.ts` already holds the control
// reminders for the same reason; this is the same idea for the two new kinds
// of poke.
//
// Both obey B5's rule, which is the whole architecture of push in this app:
// **the server sends a poke with no body and the device writes the words.**
// Neither of these functions could be evaluated on the server even in
// principle — one needs her gestational week, the other needs a cheer she has
// not seen — which is what makes that rule enforceable rather than aspirational.

export interface NotificationText {
  title: string;
  body: string;
}

/**
 * "Consejos de la semana" — the toggle that has never had a sender.
 *
 * Built on C2's `weeklyLine`, the one-liner the home screen already leads
 * with, so a woman who taps the notification lands on the same sentence she
 * was just shown. Writing a second pool of weekly copy for push would be two
 * editorial surfaces that drift.
 *
 * `null` when there is no line for the week — including when there is no week
 * at all, on a companion's device that opted into tips. The caller falls back;
 * a notification is a poke that must show *something*, and "something true and
 * general" beats "semana null".
 */
export function weeklyTipSentence(week: number | null): NotificationText | null {
  if (week === null) return null;
  const line = weeklyLine(week);
  if (!line) return null;
  return {
    title: `Semana ${week}`,
    body: line,
  };
}

/**
 * "Te mandaron un mimo."
 *
 * The cheer's own words, rendered from `lib/sharing/cheers.ts` on the reading
 * device — the same list the home screen renders from, and the reason the wire
 * only ever carried an id.
 *
 * **It never says who sent it.** The push payload could not carry a name
 * (there is no payload), but the service worker *could* read one out of
 * `/api/v1/sharing` and put it on a lock screen. It does not: a lock screen is
 * the one part of a phone other people read over your shoulder, and "Tu pareja
 * te mandó un mimo" on a shared or borrowed phone says more about her than she
 * chose to say. The app itself shows who, behind the lock.
 */
export function cheerSentence(cheerId: string): NotificationText {
  const cheer = cheerById(cheerId);
  return {
    title: "Te mandaron un mimo",
    // An id that no longer exists degrades to the generic line rather than
    // crashing the poke — the same rule `cheerById` gives the home screen.
    body: cheer ? `${cheer.emoji} ${cheer.text.es}` : "Alguien de tu familia te mandó ánimo.",
  };
}
