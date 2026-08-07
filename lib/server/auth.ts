import "server-only";

import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "./db";
import { accounts, sessions, users, verificationTokens } from "./schema";
import {
  enabledProviders,
  isAuthConfigured as isAuthConfiguredForEnv,
  type ProviderId,
} from "@/lib/auth/config";
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  hasValidConsent,
} from "@/lib/auth/consent";

// BUILD-PLAN A2 — Auth.js (NextAuth v5) wiring.
//
// The discipline here is copied deliberately from lib/server/db.ts: nothing
// connects, reads a secret or throws at import time. `AUTH_SECRET`,
// `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` and `DATABASE_URL` may all be unset —
// that is local-only mode ("seguir sin cuenta"), which ARCHITECTURE.md §4.2
// makes a first-class path, not a degraded one. Call sites branch on
// `isAuthAvailable()` and render the local-only story instead.
//
// Session strategy is JWT in an httpOnly cookie (ARCHITECTURE.md §6), not
// database sessions: it keeps every page render a cookie read instead of a
// round-trip to Hostinger's MySQL, which matters on Paraguayan mobile data.
// The Drizzle adapter is still present — it owns `users` and `accounts`, so
// account linking by email and the A5 deletion story work unchanged.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

/**
 * True when a sign-in could actually complete in this process: a session
 * secret, at least one provider, AND a database to store the account in.
 * Auth without a database would hand out sessions with nothing behind them.
 */
export function isAuthAvailable(): boolean {
  return isAuthConfiguredForEnv(process.env) && isDatabaseConfigured();
}

/** The providers to render on the sign-in screen, in display order. */
export function availableProviders(): ProviderId[] {
  return isAuthAvailable() ? enabledProviders(process.env) : [];
}

/** Where the sign-in callback sends a user who arrived without consent. */
export const CONSENT_REQUIRED_URL = "/cuenta?error=consentimiento";

async function consentGiven(): Promise<boolean> {
  const jar = await cookies();
  return hasValidConsent(jar.get(CONSENT_COOKIE)?.value, Date.now());
}

async function clearConsentCookie(): Promise<void> {
  try {
    (await cookies()).delete(CONSENT_COOKIE);
  } catch {
    // Deleting cookies is only allowed in a mutable request context. If we are
    // somewhere read-only the ticket simply expires on its own (15 min).
  }
}

function buildConfig(): NextAuthConfig {
  const providers = [];
  const enabled = enabledProviders(process.env);

  if (enabled.includes("google")) {
    // No `authorization.scope` override, on purpose. ARCHITECTURE.md §4.7:
    // sign-in identity is the minimum the provider will give — name, email,
    // avatar URL. The provider defaults are exactly openid/email/profile.
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (enabled.includes("facebook")) {
    providers.push(
      Facebook({
        clientId: process.env.AUTH_FACEBOOK_ID,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  return {
    // Hostinger terminates TLS in front of the Node process, so the forwarded
    // host header is the only truth about the public origin.
    trustHost: true,
    adapter: isDatabaseConfigured()
      ? DrizzleAdapter(db(), {
          usersTable: users,
          accountsTable: accounts,
          sessionsTable: sessions,
          verificationTokensTable: verificationTokens,
        })
      : undefined,
    providers,
    session: { strategy: "jwt" },
    pages: {
      // Our branded screen replaces the stock Auth.js pages entirely — both
      // the sign-in form and the error page land on /cuenta.
      signIn: "/cuenta",
      error: "/cuenta",
    },
    callbacks: {
      /**
       * The consent gate. This is what makes the checkbox on /cuenta real
       * rather than cosmetic: without a valid ticket the sign-in is refused
       * here, on the server, no matter how the user reached the provider.
       */
      async signIn() {
        if (await consentGiven()) return true;
        return CONSENT_REQUIRED_URL;
      },
      async jwt({ token, user }) {
        // `user` is only present on the sign-in pass; afterwards the id rides
        // in the token, which is what lets sessions survive a reload with no
        // database read.
        if (user?.id) token.sub = user.id;
        return token;
      },
      async session({ session, token }) {
        if (token.sub) session.user.id = token.sub;
        return session;
      },
    },
    events: {
      /**
       * Record the consent against the account. Runs after the adapter has
       * created or linked the user, so `user.id` is real. Writing it on every
       * sign-in (not just the first) means the row always reflects the most
       * recent acceptance of the current text.
       */
      async signIn({ user }) {
        if (user?.id && isDatabaseConfigured()) {
          await db()
            .update(users)
            .set({
              healthDataConsentAt: new Date(),
              healthDataConsentVersion: CONSENT_VERSION,
            })
            .where(eq(users.id, user.id));
        }
        // One ticket, one sign-in.
        await clearConsentCookie();
      },
    },
  };
}

type NextAuthInstance = ReturnType<typeof NextAuth>;

let cached: NextAuthInstance | undefined;

/**
 * Built lazily and once. Lazily because the configuration depends on env that
 * must be read at request time rather than frozen into a build; once because
 * the Drizzle adapter should share the single connection pool.
 */
function instance(): NextAuthInstance {
  if (!cached) cached = NextAuth(buildConfig());
  return cached;
}

/**
 * Route handlers for /api/auth/[...nextauth].
 *
 * In local-only mode the endpoint genuinely does not exist, so it 404s rather
 * than letting Auth.js throw `MissingSecret` and hand back a 500. A build with
 * no credentials is a supported configuration, not a broken one, and its logs
 * should say so.
 */
export const handlers = {
  GET: (req: NextRequest) =>
    isAuthAvailable()
      ? instance().handlers.GET(req)
      : new Response("auth not configured", { status: 404 }),
  POST: (req: NextRequest) =>
    isAuthAvailable()
      ? instance().handlers.POST(req)
      : new Response("auth not configured", { status: 404 }),
};

/**
 * The current session, or null. Never throws: when auth is unconfigured it
 * returns null without touching cookies, so a page that renders the signed-out
 * state stays renderable in local-only mode.
 */
export async function getSession(): Promise<Session | null> {
  if (!isAuthAvailable()) return null;
  return (await instance().auth()) ?? null;
}

/** Start a provider sign-in. Redirects (throws NEXT_REDIRECT) on success. */
export async function signIn(
  provider: ProviderId,
  options: { redirectTo?: string } = {},
): Promise<void> {
  await instance().signIn(provider, options);
}

/** End the session and clear the cookie. Redirects on success. */
export async function signOut(
  options: { redirectTo?: string } = {},
): Promise<void> {
  await instance().signOut(options);
}
