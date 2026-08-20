"use client";

import { useEffect, useRef, useState } from "react";

import { createInviteCode, publishCompanionSnapshot } from "@/lib/sharing/client";
import {
  familyInvitePayload,
  familyInviteClipboardText,
  familyInviteWhatsAppUrl,
  type InviteRole,
} from "@/lib/sharing/inviteLink";

import { BackButton, PrimaryButton } from "./controls";

const INVITE_ROLE_LABELS: Record<InviteRole, string> = {
  partner: "Mi pareja",
  family: "Familia o amiga",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

/**
 * "Invitá a tu pareja y a tu familia", inside onboarding.
 *
 * The invite itself is E1's: a single-use code, created on the server against
 * the caller's own pregnancy. What K1 adds is the link that carries it and the
 * WhatsApp hand-off — Paraguay's actual distribution channel — plus publishing
 * the companion snapshot first, so whoever accepts sees a real week instead of
 * an empty card.
 */
export function InviteStep({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [role, setRole] = useState<InviteRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const published = useRef(false);

  useEffect(() => {
    // The owner's device is the only thing that can publish the snapshot
    // (E1). Doing it here means the invitee's first open shows the week.
    if (published.current) return;
    published.current = true;
    void publishCompanionSnapshot();
  }, []);

  const payload = code && role ? familyInvitePayload(APP_URL, code, role) : null;

  async function invite(target: InviteRole) {
    setBusy(true);
    setMessage("");
    const created = await createInviteCode(target);
    setBusy(false);
    if (!created) {
      setMessage("No pudimos crear el código. ¿Tenés conexión?");
      return;
    }
    setRole(target);
    setCode(created.code);
  }

  async function copyLink() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(familyInviteClipboardText(payload));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("No pudimos copiar el link. Podés pasarle el código a mano.");
    }
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu familia
      </p>
      <h2 className="mt-1 text-lg font-black text-ink">
        Invitá a quien te acompaña
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Van a ver tu semana, tu fecha probable de parto y tu próximo control
        desde su propio teléfono. <strong>No van a ver</strong> tus notas, tus
        síntomas, tu peso ni tus fotos.
      </p>

      <div className="mt-4 flex gap-2">
        {(Object.keys(INVITE_ROLE_LABELS) as InviteRole[]).map((r) => (
          <button
            key={r}
            type="button"
            disabled={busy}
            onClick={() => void invite(r)}
            className={`min-h-[44px] flex-1 rounded-tile px-3 text-sm font-extrabold transition active:scale-[0.99] disabled:opacity-60 ${
              role === r ? "bg-petrol text-white" : "bg-cream text-petrol"
            }`}
          >
            {INVITE_ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {code && (
        <div className="mt-4 rounded-tile bg-pastel-salvia p-3">
          <p className="text-xs text-ink">
            {payload
              ? "Mandale este link por WhatsApp:"
              : "Pasale este código:"}
          </p>
          <p className="mt-1 text-2xl font-black tracking-[3px] text-ink">
            {code}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Sirve una sola vez y vence en 14 días.
          </p>

          {payload && (
            <div className="mt-3 space-y-2">
              <a
                href={familyInviteWhatsAppUrl(payload)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] w-full items-center justify-center rounded-tile bg-whatsapp px-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
              >
                Mandar por WhatsApp
              </a>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="min-h-[44px] w-full rounded-tile bg-white px-4 text-sm font-extrabold text-petrol shadow-soft"
              >
                {copied ? "Link copiado" : "Copiar el link"}
              </button>
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-3 text-sm text-terracotta">{message}</p>}

      <PrimaryButton onClick={onFinish} label="Empezar" />
      <p className="mt-2 px-1 text-center text-xs text-muted">
        Podés invitar a más gente después, desde Familia.
      </p>
      <BackButton onClick={onBack} />
    </div>
  );
}
