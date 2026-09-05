"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import {
  availableProviders,
  isAuthAvailable,
  registerCredentialsUser,
  signIn,
  signInWithCredentials,
  signOut,
} from "@/lib/server/auth";
import { PROVIDER_IDS } from "@/lib/auth/config";
import { EmailSchema, PasswordSchema } from "@/lib/auth/password";
import {
  CONSENT_COOKIE,
  CONSENT_TTL_MS,
  encodeConsent,
} from "@/lib/auth/consent";

// BUILD-PLAN A2 — the two server actions behind the sign-in screen.
//
// Server actions are API surface: anyone can post to them, so the input is
// zod-whitelisted the same way `/api/v1/placements` whitelists its query
// (standing rule 4). The consent checkbox is validated here AND enforced again
// in the NextAuth `signIn` callback — this action is the only place that can
// mint the ticket, and that callback is the only thing that accepts one.

/**
 * Where a completed sign-in lands, keyed by where it started (K1).
 *
 * A closed set of destinations rather than a `redirectTo` string, deliberately:
 * this action is a public POST endpoint, and a caller-supplied redirect target
 * is an open redirect waiting for somebody to forget to validate it. Onboarding
 * needs the user back on "/" so the flow can resume from its saved draft; every
 * other entry point still lands on /ajustes as it did before.
 */
const SIGN_IN_DESTINATIONS = {
  cuenta: "/ajustes",
  onboarding: "/",
} as const;

/** Shared by every sign-in/sign-up action below — see SIGN_IN_DESTINATIONS. */
const FromSchema = z
  .enum(Object.keys(SIGN_IN_DESTINATIONS) as ["cuenta", "onboarding"])
  .default("cuenta");

const StartSignInSchema = z
  .object({
    provider: z.enum(PROVIDER_IDS),
    // An unchecked checkbox is absent from the FormData entirely, so the only
    // value that can ever satisfy this is a deliberate tick.
    consent: z.literal("on"),
    from: FromSchema,
  })
  .strict();

/** PR-20 — email + password, shared shape for both signup and login. */
const CredentialsFormSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    consent: z.literal("on"),
    from: FromSchema,
  })
  .strict();

function setConsentCookie(jar: Awaited<ReturnType<typeof cookies>>): void {
  jar.set(CONSENT_COOKIE, encodeConsent(Date.now()), {
    httpOnly: true,
    // `lax` (not `strict`) so the cookie is still sent when Google redirects
    // the user back to us — a strict cookie would be dropped on that hop and
    // every sign-in would fail the consent gate.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(CONSENT_TTL_MS / 1000),
  });
}

export interface SignInState {
  error?: string;
}

export async function startSignIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isAuthAvailable()) {
    return {
      error:
        "Las cuentas no están disponibles en esta versión. Podés seguir usando Mi Bebé sin cuenta.",
    };
  }

  const parsed = StartSignInSchema.safeParse({
    provider: formData.get("provider"),
    consent: formData.get("consent") ?? undefined,
    // Absent means the default ("cuenta"). An unknown value is a rejection,
    // not a fallback — a caller sending one is not a user who mis-ticked a box.
    from: formData.get("from") ?? undefined,
  });

  if (!parsed.success) {
    // The only field a real user can get wrong is the checkbox, so name it
    // instead of showing a generic validation error.
    return {
      error:
        "Para crear tu cuenta necesitamos que marques la casilla de consentimiento.",
    };
  }

  const { provider, from } = parsed.data;
  if (!availableProviders().includes(provider)) {
    return { error: "Ese método de ingreso no está disponible ahora mismo." };
  }

  setConsentCookie(await cookies());

  // Throws NEXT_REDIRECT on success — deliberately not wrapped in try/catch,
  // which would swallow the redirect and strand the user on this page.
  await signIn(provider, { redirectTo: SIGN_IN_DESTINATIONS[from] });
  return {};
}

/** PR-20 — create an account with email + password. */
export async function registerWithPassword(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isAuthAvailable()) {
    return {
      error:
        "Las cuentas no están disponibles en esta versión. Podés seguir usando Mi Bebé sin cuenta.",
    };
  }

  const parsed = CredentialsFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    consent: formData.get("consent") ?? undefined,
    from: formData.get("from") ?? undefined,
  });
  if (!parsed.success) {
    return {
      error:
        "Revisá tu correo, tu contraseña (mínimo 8 caracteres) y marcá la casilla de consentimiento.",
    };
  }

  const { email, password, from } = parsed.data;
  const result = await registerCredentialsUser(email, password);
  if (!result.ok) {
    return {
      error:
        result.error === "email-taken"
          ? "Ese correo ya tiene una cuenta. Iniciá sesión en su lugar."
          : "No pudimos crear tu cuenta ahora. Probá de nuevo en un momento.",
    };
  }

  setConsentCookie(await cookies());

  // Throws NEXT_REDIRECT on success, same as startSignIn above.
  await signInWithCredentials(email, password, {
    redirectTo: SIGN_IN_DESTINATIONS[from],
  });
  return {};
}

/** PR-20 — sign in with an existing email + password account. */
export async function signInWithPasswordAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isAuthAvailable()) {
    return {
      error:
        "Las cuentas no están disponibles en esta versión. Podés seguir usando Mi Bebé sin cuenta.",
    };
  }

  const parsed = CredentialsFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    consent: formData.get("consent") ?? undefined,
    from: formData.get("from") ?? undefined,
  });
  if (!parsed.success) {
    return {
      error:
        "Revisá tu correo y tu contraseña, y marcá la casilla de consentimiento.",
    };
  }

  const { email, password, from } = parsed.data;
  setConsentCookie(await cookies());

  // Throws NEXT_REDIRECT on success, or redirects to
  // /cuenta?error=CredentialsSignin when authorize() rejected it.
  await signInWithCredentials(email, password, {
    redirectTo: SIGN_IN_DESTINATIONS[from],
  });
  return {};
}

export async function signOutAction(): Promise<void> {
  if (!isAuthAvailable()) return;
  await signOut({ redirectTo: "/ajustes" });
}
