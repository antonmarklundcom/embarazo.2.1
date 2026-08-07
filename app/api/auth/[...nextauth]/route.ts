import { handlers } from "@/lib/server/auth";

// BUILD-PLAN A2 — the Auth.js mount point (ARCHITECTURE.md §6).
//
// Always dynamic: every request here reads or writes the session cookie, and
// the provider callback carries a one-time OAuth code that must never be
// cached or prerendered.
export const dynamic = "force-dynamic";

export const { GET, POST } = handlers;
