import type { DefaultSession } from "next-auth";

// BUILD-PLAN A2. Widen the session user with the two app-specific fields the
// jwt/session callbacks in lib/server/auth.ts put there, so route handlers and
// the admin guard are type-safe rather than casting.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** A7 admin gate. Defaults to "user" for every new account. */
      role: "user" | "admin";
      /** Accepted consent version, or null if the user has not consented yet. */
      consentVersion: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "user" | "admin";
    consentVersion?: string | null;
  }
}

export {};
