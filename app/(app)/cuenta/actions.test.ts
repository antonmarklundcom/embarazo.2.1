import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  availableProviders: vi.fn(() => ["google"]),
  isAuthAvailable: vi.fn(() => true),
  registerCredentialsUser: vi.fn(async () => ({ ok: true })),
  signIn: vi.fn(async () => {}),
  signInWithCredentials: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
}));
const cookieSet = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/auth", () => auth);
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
  headers: async () => new Headers(),
}));
import { registerWithPassword, signInWithPasswordAction, signOutAction, startSignIn } from "./actions";

function form(fields: Record<string, string>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(fields)) result.set(key, value);
  return result;
}
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("account entry server actions", () => {
  it("requires explicit consent before initiating Google OAuth", async () => {
    expect((await startSignIn({}, form({ provider: "google" }))).error).toContain("consentimiento");
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });
  it("resumes home before a tool and keeps personal dates out of its OAuth return URL", async () => {
    await startSignIn({}, form({ provider: "google", consent: "on", returnTo: "/herramientas/resumen?fum=2026-08-01&utm_source=site" }));
    expect(auth.signIn).toHaveBeenCalledWith("google", { redirectTo: "/?continue=%2Fherramientas%2Fresumen%3Futm_source%3Dsite" });
    expect(cookieSet).toHaveBeenCalledOnce();
  });
  it("cannot redirect an OAuth login to an external origin", async () => {
    await startSignIn({}, form({ provider: "google", consent: "on", returnTo: "//evil.test" }));
    expect(auth.signIn).toHaveBeenCalledWith("google", { redirectTo: "/" });
  });
  it("disables new password signups by default without reaching account creation", async () => {
    vi.stubEnv("AUTH_EMAIL_SIGNUP_ENABLED", "");
    expect((await registerWithPassword({}, form({ email: "mama@example.test", password: "some-password", consent: "on" }))).error).toContain("Google");
    expect(auth.registerCredentialsUser).not.toHaveBeenCalled();
  });
  it("retains existing password login but completes onboarding before the requested tool", async () => {
    await signInWithPasswordAction({}, form({ email: "mama@example.test", password: "some-password", consent: "on", returnTo: "/herramientas/peso" }));
    expect(auth.signInWithCredentials).toHaveBeenCalledWith("mama@example.test", "some-password", { redirectTo: "/?continue=%2Fherramientas%2Fpeso" });
  });
  it("returns to public account entry after sign-out", async () => {
    await signOutAction();
    expect(auth.signOut).toHaveBeenCalledWith({ redirectTo: "/cuenta" });
  });
});
