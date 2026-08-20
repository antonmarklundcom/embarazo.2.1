"use client";

import { useEffect, useState } from "react";

import { acceptInviteCode } from "@/lib/sharing/client";
import { isValidInviteCode } from "@/lib/sharing/fields";
import {
  INVITE_CODE_MALFORMED,
  inviteFailureMessage,
} from "@/lib/sharing/inviteMessages";
import type { AuthStatus } from "@/lib/auth/status";

import { BackButton, FIELD_CLASS, PrimaryButton } from "./controls";

// K9-F5 — "Me invitaron / tengo un código", the last step of the invited flow.
//
// The redemption itself is E1's, unchanged: a single-use code, spent against
// the caller's own account. What this step adds is that a companion can now
// reach it *during first run*, instead of being walked through the pregnant
// woman's questions and then left to find `/familia` on his own.
//
// Two things it deliberately does not do:
//
//   • **It does not redeem automatically.** The code arrives prefilled from
//     the link when there is one, and then waits for a tap — the same rule
//     `/familia` follows (K1). A single-use capability that spends itself on
//     page load can be burned by a preview fetch, a mis-tap, or the wrong
//     person opening a forwarded message.
//   • **It does not trap anybody.** "Seguir sin código" finishes onboarding
//     into a working app. A code that does not work — expired, already used,
//     no connection — must not be the wall between somebody and the app they
//     just installed; `/familia` accepts a code any day later.
export function CodigoStep({
  auth,
  initialCode,
  onDone,
  onBack,
}: {
  auth: AuthStatus | null;
  /** From `/?codigo=…`, when somebody arrived on the WhatsApp link. */
  initialCode?: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialCode) setCode(initialCode.toUpperCase());
  }, [initialCode]);

  const signedIn = auth?.signedIn === true;

  async function accept() {
    const value = code.trim().toUpperCase();
    setMessage("");
    if (!isValidInviteCode(value)) {
      setMessage(INVITE_CODE_MALFORMED);
      return;
    }
    setBusy(true);
    const result = await acceptInviteCode(value);
    setBusy(false);
    if (result.ok) {
      onDone();
      return;
    }
    setMessage(inviteFailureMessage(result.reason));
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu invitación
      </p>
      <h2 className="mt-1 text-lg font-black text-ink">Poné tu código</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Es el código de seis caracteres que te pasaron por WhatsApp. Si tocaste
        el link, ya lo pusimos acá.
      </p>

      {!signedIn && (
        <p className="mt-3 rounded-tile border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm font-semibold text-terracotta">
          Para usar el código hace falta entrar con tu cuenta. Volvé al paso
          anterior, o seguí y usalo más tarde desde Familia.
        </p>
      )}

      <label htmlFor="invite-code" className="mt-4 block text-sm font-extrabold text-ink">
        Código
      </label>
      <input
        id="invite-code"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        className={`mt-2 text-center text-xl font-black tracking-[4px] ${FIELD_CLASS}`}
      />

      {message && <p className="mt-3 text-sm text-terracotta">{message}</p>}

      <PrimaryButton
        disabled={busy || !signedIn || code.trim().length === 0}
        onClick={() => void accept()}
        label={busy ? "Conectando…" : "Usar el código"}
      />
      <button
        type="button"
        onClick={onDone}
        className="mt-2 min-h-[44px] w-full text-sm font-bold text-petrol underline"
      >
        Seguir sin código
      </button>
      <BackButton onClick={onBack} />
    </div>
  );
}
