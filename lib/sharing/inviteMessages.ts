// K9-F5 — what to tell somebody whose invite code did not work.
//
// Extracted from `/familia` when onboarding grew a second place that redeems a
// code (`components/onboarding/CodigoStep.tsx`). Two screens rendering two
// different sentences for the same server answer is how a support conversation
// becomes unanswerable.
//
// Pulling it out surfaced a bug worth naming: `/familia` mapped *every*
// failure it did not recognise to "No encontramos ese código", including
// `offline` — which `acceptInviteCode` returns when the fetch itself threw.
// Telling a woman on a dropped connection that her sister's code is wrong
// sends her back to WhatsApp to ask for a new one that will fail the same way.

/** The reasons `acceptInviteCode` can come back with. */
export type InviteFailure = "expired" | "used" | "offline" | "unknown";

export function inviteFailureMessage(reason: string | undefined): string {
  switch (reason) {
    case "expired":
      return "Ese código venció. Pedile uno nuevo.";
    case "used":
      return "Ese código ya fue usado por otra persona.";
    case "offline":
      return "No pudimos conectarnos. Fijate si tenés internet y probá de nuevo.";
    default:
      return "No encontramos ese código.";
  }
}

/** What to say when the code is malformed before we even ask the server. */
export const INVITE_CODE_MALFORMED =
  "Ese código no parece válido. Fijate que esté completo.";
