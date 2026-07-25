import Link from "next/link";
import type { Metadata } from "next";
import { enabledProviderIds, isAuthEnabled } from "@/lib/authConfig";
import { ProviderButtons } from "./ProviderButtons";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

// BUILD-PLAN A2. Server component so provider availability is read from real
// server configuration rather than a mirrored public variable.
export default function EntrarPage() {
  const enabled = isAuthEnabled(process.env);
  const providers = enabledProviderIds(process.env);

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Guardá tu embarazo
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Con una cuenta, tus registros se copian de forma segura. Si cambiás
          de teléfono o borrás la app, entrás de nuevo y está todo ahí.
        </p>
      </header>

      {enabled ? (
        <ProviderButtons providers={providers} />
      ) : (
        <div className="rounded-card border border-line bg-white p-5 text-center">
          <p className="text-sm font-extrabold text-ink">
            Las cuentas todavía no están disponibles
          </p>
          <p className="mt-1 text-sm text-muted">
            Podés usar Mi Bebé igual: todo funciona y tus datos quedan
            guardados en este teléfono.
          </p>
        </div>
      )}

      <div className="rounded-card border border-line bg-white p-4">
        <h2 className="text-sm font-extrabold text-ink">
          Qué guardamos y qué no
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">
          <li>
            Guardamos tus registros (semanas, síntomas, controles) para poder
            devolvértelos en otro teléfono.
          </li>
          <li>
            <strong className="font-extrabold text-ink">
              Tus fotos no se suben
            </strong>{" "}
            — las de la panza y las del carné quedan solo en tu teléfono.
          </li>
          <li>De Google o Facebook recibimos tu nombre, correo y foto de perfil. Nada más.</li>
          <li>Podés borrar tu cuenta y todo lo guardado cuando quieras.</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Leé la{" "}
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

      <div className="text-center">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center text-sm font-extrabold text-petrol"
        >
          Seguir sin cuenta
        </Link>
        <p className="mt-1 text-xs text-muted">
          Todo funciona igual. Tus datos quedan solo en este teléfono.
        </p>
      </div>
    </div>
  );
}
