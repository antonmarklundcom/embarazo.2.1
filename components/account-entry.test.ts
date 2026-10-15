import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/cuenta/actions", () => ({
  startSignIn: vi.fn(async () => ({})),
  signInWithPasswordAction: vi.fn(async () => ({})),
}));

import { SignInCard } from "./SignInCard";
import { AccountStep } from "./onboarding/AccountStep";

describe("account entry benefits and feedback", () => {
  it("explains tracking benefits without making guides the primary action", () => {
    const markup = renderToStaticMarkup(createElement(SignInCard, {
      providers: ["google"], credentialsAvailable: true,
    }));
    expect(markup).toContain("Todo lo que sumás con tu cuenta");
    expect(markup).toContain("tus síntomas, ánimo y peso");
    expect(markup).toContain("Tus controles y preguntas");
    expect(markup).toContain("registros sincronizados");
    expect(markup).toContain("Las guías son solo el comienzo");
    expect(markup).toContain("Empezar con Google");
    expect(markup).not.toContain("Crear cuenta con correo");
    const guidesLink = markup.match(/<a[^>]*href="\/guias"[^>]*>/)?.[0];
    expect(guidesLink).toContain("underline");
    expect(guidesLink).not.toContain("bg-petrol text-white");
  });

  it.each(["account", "onboarding"])("keeps %s Google feedback consistent and consent required", (screen) => {
    const markup = renderToStaticMarkup(screen === "account"
      ? createElement(SignInCard, { providers: ["google"], credentialsAvailable: false })
      : createElement(AccountStep, {
        auth: { providers: ["google"], credentialsAvailable: false, signedIn: false, accountRequired: true, accountId: null },
        isLast: false, invited: false, onSkip: vi.fn(), onContinue: vi.fn(), onBack: vi.fn(),
      }));
    const googleButton = markup.match(/<button[^>]*>/g)?.find((tag) => tag.includes('name="provider"') && tag.includes('value="google"'));
    expect(googleButton).toContain('disabled=""');
    expect(googleButton).toContain('aria-busy="false"');
    expect(markup).toContain("enabled:hover:bg-petrol/90");
    expect(markup).toContain("focus-visible:outline-petrol");
    expect(markup).toContain("disabled:cursor-not-allowed");
    expect(markup).toContain("motion-reduce:transition-none motion-reduce:scale-100");
    expect(markup).toContain("Empezar con Google");
  });

  it("explains why retry is disabled after an OAuth error", () => {
    const markup = renderToStaticMarkup(createElement(SignInCard, {
      providers: ["google"], credentialsAvailable: false, initialError: "No pudimos abrir el ingreso.",
    }));
    expect(markup).toContain("Para volver a intentarlo, marcá otra vez la casilla de consentimiento.");
    expect(markup).toContain('disabled="" aria-busy="false"');
  });
});
