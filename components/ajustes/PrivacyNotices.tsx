// W4: the three read-only cards of the "Privacidad" group, moved verbatim out
// of AjustesClient. `FaqLinkCard` is separate from the other two because the
// PIN card sits between them.

import Link from "next/link";

import { APP_NAME } from "@/lib/brand";

/** E6: the trust questions, one tap from where somebody is already thinking
    about their data. */
export function FaqLinkCard() {
  return (
    <Link
      href="/preguntas"
      className="block rounded-card bg-white p-4 shadow-soft transition active:scale-[0.99]"
    >
      <h2 className="text-base font-extrabold text-ink">Preguntas frecuentes</h2>
      <p className="mt-1 text-sm text-muted">
        Quién ve tus datos, qué pasa si borrás la app, si hace falta una
        cuenta.
      </p>
    </Link>
  );
}

/**
 * The privacy summary and the medical disclaimer. A fragment, so both stay
 * direct children of the group's `space-y-3` stack and keep their spacing.
 */
export function PrivacyNotices() {
  return (
    <>
      {/* Privacy summary */}
      <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <h2 className="text-base font-extrabold text-ink">Tu privacidad</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-ink">
          <li>
            • Podés usar {APP_NAME} sin cuenta. Si no creás una, no tenemos tu
            correo ni tu nombre.
          </li>
          <li>
            • Sin cuenta, tus datos de salud se guardan solo en este
            dispositivo.
          </li>
          <li>
            • Con cuenta, tus registros (síntomas, ánimo, peso, diario,
            controles, calendario) se copian a tu cuenta para que no los
            pierdas. Tus fotos, solo si activás «Copia de tus fotos»; las notas
            con PIN, nunca.
          </li>
          <li>
            • Sin cuenta, lo único que viaja al servidor es tu trimestre y tu
            departamento, para mostrarte recursos cercanos.
          </li>
          <li>• No usamos cookies de seguimiento ni rastreadores.</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          <Link href="/privacidad" className="underline">
            Política de privacidad
          </Link>
          {" · "}
          <Link href="/terminos" className="underline">
            Términos de uso
          </Link>
        </p>
      </section>

      {/* Medical disclaimer */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Aviso médico</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {APP_NAME} es una herramienta informativa y de acompañamiento. No reemplaza
          la atención de un profesional de la salud y no realiza diagnósticos.
          Ante cualquier duda o síntoma, contactá a tu médico/a, hospital o
          sanatorio.
        </p>
      </section>
    </>
  );
}
