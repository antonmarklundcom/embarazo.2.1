import "server-only";

import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import {
  isAuthEnabled,
  isFacebookConfigured,
  isGoogleConfigured,
} from "@/lib/authConfig";
import { db, isDatabaseConfigured } from "./db";
import { accounts, sessions, users, verificationTokens } from "./schema";

// BUILD-PLAN A2 — Auth.js (NextAuth v5).
//
// Two properties this file has to preserve:
//
//   1. **It must be importable with nothing configured.** `app/api/auth/
//      [...nextauth]/route.ts` imports it unconditionally, and a local build
//      with no DATABASE_URL must still succeed. So the adapter is attached only
//      when a database exists and provider list is built from whatever is
//      present — an empty provider list is a valid state.
//   2. **Sign-in identity stays minimal** (ARCHITECTURE.md §4.7): name, email,
//      avatar. No extra scopes are requested from either provider, ever.

function providers() {
  const list = [];
  if (isGoogleConfigured(process.env)) {
    list.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        // Default scopes only (openid, email, profile). Do not widen.
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  if (isFacebookConfigured(process.env)) {
    list.push(
      Facebook({
        clientId: process.env.AUTH_FACEBOOK_ID!,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  return list;
}

// `allowDangerousEmailAccountLinking` above is deliberate and is the reason
// `users.email` is unique: a user who signs in with Google today and Facebook
// tomorrow on the same verified address gets ONE account, not two accounts each
// holding half a pregnancy. Both providers verify email addresses, which is the
// condition under which this setting is safe.

export const authConfig: NextAuthConfig = {
  adapter: isDatabaseConfigured()
    ? DrizzleAdapter(db(), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  providers: providers(),
  session: { strategy: "jwt" },
  // Self-hosted on Hostinger behind their proxy: the forwarded Host header is
  // the app's real host, and Auth.js otherwise rejects every request with
  // UntrustedHost (including the session endpoint, which then errors on every
  // page load rather than simply answering "not signed in").
  trustHost: true,
  pages: {
    signIn: "/entrar",
    error: "/entrar",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Carry the app-specific bits into the token so route handlers do not
      // hit the database on every request.
      if (user?.id) {
        token.userId = user.id;
        if (isDatabaseConfigured()) {
          const row = await db()
            .select({
              role: users.role,
              consentVersion: users.consentVersion,
            })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);
          token.role = row[0]?.role ?? "user";
          token.consentVersion = row[0]?.consentVersion ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? session.user.id;
        session.user.role = (token.role as "user" | "admin") ?? "user";
        session.user.consentVersion =
          (token.consentVersion as string | null) ?? null;
      }
      return session;
    },
  },
};

const nextAuth = NextAuth(authConfig);

export const { handlers, signIn, signOut } = nextAuth;

/**
 * The current session, or null. Always null when auth is not configured, so
 * callers get local-only mode rather than an exception.
 */
export const auth: typeof nextAuth.auth = nextAuth.auth;

export function authEnabled(): boolean {
  return isAuthEnabled(process.env);
}
