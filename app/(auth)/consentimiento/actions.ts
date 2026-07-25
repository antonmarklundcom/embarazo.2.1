"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CONSENT_VERSION } from "@/lib/authConfig";
import { auth, signOut } from "@/lib/server/auth";
import { db, isDatabaseConfigured } from "@/lib/server/db";
import { users } from "@/lib/server/schema";

// BUILD-PLAN A2. Records the accepted consent version against the user.

export async function acceptConsent(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/entrar");
  if (!isDatabaseConfigured()) redirect("/");

  await db()
    .update(users)
    .set({ consentVersion: CONSENT_VERSION, consentAt: new Date() })
    .where(eq(users.id, session.user.id));

  redirect("/");
}

/**
 * Declining is a real choice, not a dead end: we sign the user out and drop
 * them back into local-only mode, where the whole app still works. Nothing was
 * synced before consent, so there is nothing to clean up.
 */
export async function declineConsent(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
