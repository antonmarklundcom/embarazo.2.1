import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CONSENT_VERSION } from "@/lib/authConfig";
import { auth } from "@/lib/server/auth";
import { ConsentForm } from "./ConsentForm";
import { acceptConsent } from "./actions";

export const metadata: Metadata = {
  title: "Tu consentimiento",
  robots: { index: false, follow: false },
};

// BUILD-PLAN A2 / ARCHITECTURE.md §8. Consent to storing health data against an
// identity is collected explicitly here, AFTER sign-in and BEFORE any sync. It
// is deliberately not a "by continuing you agree" line on the sign-in screen:
// the thing being consented to is health data on a server, and that deserves a
// screen the user has to act on.
export default async function ConsentimientoPage() {
  const session = await auth();

  // Not signed in — nothing to consent to yet.
  if (!session?.user) redirect("/entrar");

  // Already accepted the current version; nothing to ask.
  if (session.user.consentVersion === CONSENT_VERSION) redirect("/");

  const returning = Boolean(session.user.consentVersion);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Un paso más
        </p>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          {returning
            ? "Actualizamos cómo cuidamos tus datos"
            : "Antes de guardar tus datos"}
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          {returning
            ? "Cambiamos algo importante en nuestra política. Leelo y confirmá para seguir usando tu cuenta."
            : "Para copiar tus registros a tu cuenta necesitamos que estés de acuerdo. Es tu información de salud, así que preferimos preguntarte de frente."}
        </p>
      </header>

      <div className="space-y-3 rounded-card border border-line bg-white p-5">
        <Point title="Qué se guarda">
          Tus semanas, síntomas, controles, pesos, contracciones, pataditas y
          listas. Se guardan asociados a tu cuenta para poder devolvértelos.
        </Point>
        <Point title="Qué NO se guarda">
          Tus fotos. Las de la panza y las del carné quedan solo en este
          teléfono y nunca se suben.
        </Point>
        <Point title="Quién puede verlo">
          Vos. Si invitás a tu pareja o a tu familia, ellos ven solo lo que vos
          elijas compartir — nunca tus notas ni tus fotos.
        </Point>
        <Point title="Si te arrepentís">
          Podés borrar tu cuenta y todo lo guardado desde Ajustes, cuando
          quieras, sin pedirnos permiso.
        </Point>
      </div>

      <ConsentForm action={acceptConsent} />

      <p className="text-center text-xs text-muted">
        Al confirmar aceptás la{" "}
        <Link href="/privacidad" className="font-extrabold text-terracotta">
          política de privacidad
        </Link>{" "}
        y los{" "}
        <Link href="/terminos" className="font-extrabold text-terracotta">
          términos
        </Link>
        .
      </p>
    </div>
  );
}

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      <p className="mt-0.5 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
