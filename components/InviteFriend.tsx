"use client";

import { useState } from "react";

import { inviteClipboardText, invitePayload } from "@/lib/share/invite";

// BUILD-PLAN E3 — "invitá a una amiga" (feature map #31).
//
// The distribution channel here is a WhatsApp message from somebody you trust,
// so this is the growth surface that matters more than any store listing. It
// carries a fixed sentence and the app's URL — never the week, never the due
// date: an invitation gets forwarded, and a personalised one publishes her
// pregnancy to whoever it reaches next.
//
// With no `NEXT_PUBLIC_APP_URL` configured it renders nothing at all. An
// invitation to nowhere is worse than no button.

const PAYLOAD = invitePayload(process.env.NEXT_PUBLIC_APP_URL);

export function InviteFriend() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  if (!PAYLOAD) return null;

  async function invite() {
    setError("");
    const payload = PAYLOAD!;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        return;
      }
      await navigator.clipboard.writeText(inviteClipboardText(payload));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (cause) {
      // Dismissing the share sheet is a decision, not a failure.
      if ((cause as { name?: string })?.name !== "AbortError") {
        setError("No pudimos abrir el compartir. Copiá el link a mano: " + payload.url);
      }
    }
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <h2 className="text-base font-extrabold text-ink">Invitá a una amiga</h2>
      <p className="mt-1 text-sm font-semibold text-muted">
        Si conocés a alguien embarazada, pasale la app. Es la forma en que Mi
        Bebé llega a más mamás.
      </p>
      <button
        type="button"
        onClick={() => void invite()}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-pastel-celeste px-4 text-sm font-extrabold text-ink transition active:scale-[0.99]"
      >
        {copied ? "Link copiado" : "Compartir la app"}
      </button>
      {error && <p className="mt-1 text-sm text-terracotta">{error}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        El mensaje lleva solo el link de la app. Nada de tu embarazo va en él.
      </p>
    </section>
  );
}
