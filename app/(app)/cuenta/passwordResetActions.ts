"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { EmailSchema, PasswordSchema } from "@/lib/auth/password";
import { isAuthAvailable } from "@/lib/server/auth";
import { requestPasswordReset, resetPassword } from "@/lib/server/passwordReset";

// Password reset — the two server actions. Kept in their own file rather than
// appended to `./actions.ts` because nothing here shares that file's machinery:
// no consent cookie to mint (the account already exists and already consented),
// no `SIGN_IN_DESTINATIONS` redirect, no `signIn()` call that throws
// NEXT_REDIRECT. Both of these return state and render it in place.
//
// Same discipline as every action in `./actions.ts`: a server action is public
// API surface, so the input is zod-`.strict()`-whitelisted field by field
// (standing rule 4) instead of being read straight off the FormData.
//
// There is deliberately no `redirectTo`, `next`, `callbackUrl` or any other
// caller-supplied destination in either schema. `.strict()` means sending one
// is a rejection, not an ignored extra. The one navigation this flow offers is
// a hard-coded `<Link href="/cuenta">` on the success screen — an emailed
// password-reset link is the highest-value open-redirect target a web app has,
// and the way to not have one is to have no redirect parameter at all.

const RequestSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();

const ResetSchema = z
  .object({
    // Not `EmailSchema`-style normalised: this is an opaque credential and is
    // compared by hash, so trimming or lowercasing it would corrupt it. Bounded
    // in `resetPassword()`; `z.string()` here only asserts it is one.
    token: z.string().min(1).max(512),
    password: PasswordSchema,
  })
  .strict();

export interface RequestResetState {
  /** Set once the request was accepted — the message is the same either way. */
  sent?: boolean;
  error?: string;
}

// The "si ese correo tiene una cuenta" copy lives in
// `components/PasswordResetCards.tsx`, not here: every export of a `"use
// server"` module must be an async function, so a string constant in this file
// would be a build error.

export async function requestPasswordResetAction(
  _previous: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  if (!isAuthAvailable()) {
    return {
      error:
        "El ingreso con cuenta no está activo en esta versión, así que no hay contraseña que recuperar.",
    };
  }

  const parsed = RequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Escribí un correo válido." };
  }

  const result = await requestPasswordReset(parsed.data.email, await headers());
  if (result.ok) return { sent: true };

  switch (result.error) {
    case "rate-limited":
      return { error: "Demasiados intentos. Probá de nuevo en un momento." };
    case "invalid-email":
      return { error: "Escribí un correo válido." };
    case "not-configured":
      // Request-time degradation, not a build-time gate: `lib/launchChecks.ts`
      // only blocks a build over `/borrar-cuenta`'s contact channel, which Play
      // requires to exist. Password reset is a feature, not a legal obligation,
      // so a deployment without `RESEND_API_KEY` must still build and run — it
      // just says so here instead of pretending a mail went out.
      return {
        error:
          "El cambio de contraseña no está disponible ahora mismo. Escribinos y te ayudamos a entrar.",
      };
    case "send-failed":
      return {
        error: "No pudimos enviar el correo. Intentá de nuevo en un momento.",
      };
  }
}

export interface ResetPasswordState {
  done?: boolean;
  error?: string;
}

export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  if (!isAuthAvailable()) {
    return {
      error:
        "El ingreso con cuenta no está activo en esta versión, así que no hay contraseña que recuperar.",
    };
  }

  const parsed = ResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error:
        "Elegí una contraseña de al menos 8 caracteres y volvé a abrir el enlace si te da error.",
    };
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (result.ok) return { done: true };

  switch (result.error) {
    case "invalid-token":
    case "expired":
      // One message for both. An attacker holding a guessed token learns
      // nothing from "vencido" that "inválido" did not already tell them, and
      // the action the user must take is identical.
      return {
        error:
          "Ese enlace es inválido o ya venció. Pedí uno nuevo y volvé a intentar.",
      };
    case "weak-password":
      return { error: "La contraseña necesita al menos 8 caracteres." };
    case "not-configured":
      return {
        error:
          "El cambio de contraseña no está disponible ahora mismo. Escribinos y te ayudamos a entrar.",
      };
  }
}
