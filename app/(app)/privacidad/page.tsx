import type { Metadata } from "next";

// Honest, plain-language privacy policy matching what the code actually does
// (see lib/db.ts, app/api/v1/*). DRAFT — the founder/legal counsel must
// review and finalize this before public launch (see docs/REVIEW-AND-LAUNCH-PLAN.md §4.6).
export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Mi Bebé maneja tus datos.",
};

const LAST_UPDATED = "8 de julio de 2026";

export default function PrivacidadPage() {
  return (
    <article className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Política de privacidad
        </h1>
        <p className="mt-1 text-xs text-muted">
          Última actualización: {LAST_UPDATED}
        </p>
      </header>

      <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <p className="text-sm leading-relaxed text-ink">
          Mi Bebé no te pide cuenta, correo ni número de teléfono. Tus datos de
          embarazo, síntomas, fotos y calendario menstrual se guardan
          <strong> solo en este dispositivo</strong>, en el almacenamiento
          local del navegador. No tenemos un servidor con tu historia clínica
          ni la vemos en ningún momento.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Qué datos guardamos y dónde</h2>
        <p className="text-sm leading-relaxed text-muted">
          Todo lo que registrás en Mi Bebé — fecha de última regla o fecha
          probable de parto, departamento y ciudad, síntomas y estado de
          ánimo, fotos de la panza, fotos del carné perinatal, tipo de sangre
          y alergias, peso, pataditas, contracciones, calendario menstrual,
          checklist y el PIN opcional — se guarda con IndexedDB, una base de
          datos del navegador que vive únicamente en tu teléfono o
          computadora. No sale de ahí salvo que vos decidas exportarla (ver
          &ldquo;Copia de seguridad&rdquo; en Ajustes) o borrarla.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Qué es lo único que viaja a un servidor</h2>
        <p className="text-sm leading-relaxed text-muted">
          Para mostrarte recursos y contactos cercanos (sanatorios, ecografía,
          farmacias, eventos), la app consulta nuestro servidor enviando
          únicamente tu <strong>trimestre</strong> y tu <strong>departamento</strong>
          — nunca tu nombre, tu fecha exacta, tus síntomas ni ningún otro dato
          de salud. Cuando tocás un botón de WhatsApp hacia un sanatorio o
          negocio, te redirigimos a wa.me; si configuramos atribución de
          clics, solo registramos qué recurso tocaste, tu trimestre y tu
          departamento, nunca tu identidad.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Cookies y rastreadores</h2>
        <p className="text-sm leading-relaxed text-muted">
          No usamos cookies de seguimiento ni rastreadores de terceros con
          fines publicitarios. Los videos educativos se embeben en modo de
          privacidad mejorada de YouTube (youtube-nocookie.com).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">El PIN opcional</h2>
        <p className="text-sm leading-relaxed text-muted">
          Si activás un PIN, tus notas del diario se cifran en el navegador
          antes de guardarse (AES-GCM con una clave derivada del PIN vía
          PBKDF2). Nunca guardamos el PIN en sí, solo un verificador cifrado.
          Esto depende de que tu propio dispositivo esté protegido: no es
          seguridad de grado bancario.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Tus derechos sobre tus datos</h2>
        <p className="text-sm leading-relaxed text-muted">
          Como los datos de salud viven en tu dispositivo, vos tenés control
          directo: podés exportar una copia completa o borrar todo en
          cualquier momento desde <strong>Ajustes</strong>, sin tener que
          pedírnoslo. Borrar los datos del sitio en tu navegador, o
          desinstalar la app, también elimina esta información — por eso te
          recomendamos hacer una copia de seguridad periódica si querés
          conservarla.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Contacto</h2>
        <p className="text-sm leading-relaxed text-muted">
          Si tenés dudas sobre esta política, escribinos por WhatsApp desde el
          botón de contacto de la app.
        </p>
      </section>

      <p className="text-[11px] leading-relaxed text-muted">
        Este texto describe honestamente el funcionamiento actual de la app.
        No reemplaza asesoría legal formal; el equipo de Mi Bebé lo revisa y
        actualiza periódicamente.
      </p>
    </article>
  );
}
