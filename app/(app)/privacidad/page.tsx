import type { Metadata } from "next";
import { FaqAccordion } from "@/components/FaqAccordion";
import Link from "next/link";

// Privacy policy for the account world (v3 pivot — accounts + sync). See
// DECISIONS.md "v3 pivot" and "A2 — Auth.js". DRAFT — pending lawyer review
// before public launch (see docs/REVIEW-AND-LAUNCH-PLAN.md §4.5).
export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Mi Bebé maneja tus datos.",
};

const LAST_UPDATED = "12 de agosto de 2026";

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
        <p className="mt-2 text-xs text-muted">
          Este texto fue redactado con asistencia de inteligencia artificial y
          todavía no fue revisado por un abogado.
        </p>
      </header>

      <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
        <p className="text-sm leading-relaxed text-ink">
          Podés usar Mi Bebé <strong>sin crear una cuenta</strong>: en ese caso
          tus datos de embarazo, síntomas, fotos y calendario menstrual se
          guardan solo en este dispositivo y nunca llegan a un servidor. Si
          creás una cuenta, algunos de esos datos <strong>sí viajan a
          nuestro servidor</strong> para poder sincronizarlos entre tus
          aparatos — te explicamos exactamente cuáles, más abajo. Vos elegís.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Sin cuenta: todo se queda en tu teléfono</h2>
        <p className="text-sm leading-relaxed text-muted">
          Todo lo que registrás en Mi Bebé — fecha de última regla o fecha
          probable de parto, departamento y ciudad, síntomas y estado de
          ánimo, fotos de la panza, fotos del carné perinatal, tipo de sangre
          y alergias, peso, pataditas, contracciones, calendario menstrual,
          checklist y el PIN opcional — se guarda con IndexedDB, una base de
          datos del navegador que vive únicamente en tu teléfono o
          computadora. No sale de ahí salvo que vos decidas exportarla (ver
          &ldquo;Copia de seguridad&rdquo; en Ajustes), borrarla, o crear una
          cuenta.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Con cuenta: qué se guarda en nuestro servidor</h2>
        <p className="text-sm leading-relaxed text-muted">
          Si creás una cuenta con Google (o Facebook, cuando esté disponible),
          usamos ese ingreso solo para identificarte: recibimos tu nombre, tu
          correo y tu foto de perfil, nada más. Al aceptar el paso de permiso
          en la pantalla de cuenta, tus registros de salud del embarazo —
          semanas, síntomas, ánimo, controles, peso, pataditas, contracciones,
          checklist — se copian a nuestro servidor para que puedas verlos
          desde otro celular o recuperarlos si perdés el tuyo. Es lo mismo que
          ya guardás en el dispositivo, ni más ni menos.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          <strong>Las fotos solo se suben si vos lo pedís.</strong> La foto de
          la panza y las del carné perinatal se quedan en tu teléfono, salvo
          que actives «Copia de tus fotos» en Ajustes. Si la activás, se
          guardan a tu nombre y solo vos las podés abrir; si la apagás,
          borramos las copias en ese momento. Tu pareja y tu familia no las ven
          salvo que además enciendas «fotos de la panza» en Familia. Las notas
          del diario que protegiste con PIN viajan cifradas y sin la clave para
          abrirlas — nuestro servidor no puede leerlas.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Quién puede ver tus datos</h2>
        <p className="text-sm leading-relaxed text-muted">
          Tus datos de salud sincronizados solo los ve tu cuenta. Si en algún
          momento das acceso a tu pareja o familia (función de embarazo
          compartido), esa persona ve la semana, la fecha probable de parto y
          el próximo control — nunca tus notas del diario ni tus fotos. El
          equipo de Mi Bebé no lee el contenido de tus registros de salud para
          darte soporte: cuando necesitamos ayudarte con tu cuenta vemos datos
          de cuenta (si iniciaste sesión, cuántos registros tenés) pero no lo
          que escribiste en ellos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Retención y borrado</h2>
        <p className="text-sm leading-relaxed text-muted">
          Mientras tu cuenta exista, tus datos sincronizados se guardan en
          nuestro servidor para que sigan disponibles entre tus dispositivos.
          Podés borrar tu cuenta y todo lo asociado a ella — registros
          sincronizados, embarazo, membresías familiares, invitaciones,
          notificaciones e imágenes generadas — vos misma, desde
          <strong> Ajustes → Borrar mi cuenta</strong>. Se borra del servidor,
          no queda una copia nuestra, y en el mismo paso podés borrar también
          los datos de este teléfono. Si preferís pedirlo, o si ya no tenés la
          app instalada, seguí los pasos de{" "}
          <Link href="/borrar-cuenta" className="font-bold underline">
            borrar tu cuenta
          </Link>
          . Sin cuenta,
          borrar los datos del sitio en tu navegador o desinstalar la app
          elimina esta información de inmediato, ahí no guardamos copia en
          ningún lado.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">La imagen de bebé con IA (opcional)</h2>
        <p className="text-sm leading-relaxed text-muted">
          Cuando esté disponible, la función &ldquo;así podría ser tu
          bebé&rdquo; es opcional y pide tu permiso explícito antes de usarla.
          Las fotos que subís para generarla se envían a un servicio de
          inteligencia artificial únicamente para crear la imagen y{" "}
          <strong>no se guardan</strong> después de generarla; solo se guarda
          el resultado si vos elegís conservarlo. Es una función de
          entretenimiento, aislada de tu información médica.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Notificaciones push</h2>
        <p className="text-sm leading-relaxed text-muted">
          Si activás notificaciones desde Ajustes, guardamos la suscripción
          técnica de tu navegador (no datos de salud) para poder enviarte
          avisos como recordatorios de control. Podés apagar cada categoría
          por separado o desactivarlas del todo cuando quieras; nunca las
          activamos sin que vos lo pidas.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Qué más viaja a un servidor, con o sin cuenta</h2>
        <p className="text-sm leading-relaxed text-muted">
          Para mostrarte recursos y contactos cercanos (sanatorios, ecografía,
          farmacias, eventos), la app consulta nuestro servidor enviando
          únicamente tu <strong>trimestre</strong> y tu <strong>departamento</strong>
          — nunca tu nombre, tu fecha exacta, tus síntomas ni ningún otro dato
          de salud. Cuando tocás un botón de WhatsApp hacia un sanatorio o
          negocio, te redirigimos a wa.me; si configuramos atribución de
          clics, solo registramos qué recurso tocaste, nunca tu identidad.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Cookies y rastreadores</h2>
        <p className="text-sm leading-relaxed text-muted">
          No usamos cookies de seguimiento ni rastreadores de terceros con
          fines publicitarios. La cookie de sesión que se crea al iniciar
          sesión con cuenta solo sirve para mantenerte identificado en la app.
          Los videos educativos se embeben en modo de privacidad mejorada de
          YouTube (youtube-nocookie.com).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">El PIN opcional</h2>
        <p className="text-sm leading-relaxed text-muted">
          Si activás un PIN, tus notas del diario se cifran en el navegador
          antes de guardarse (AES-GCM con una clave derivada del PIN vía
          PBKDF2). Nunca guardamos el PIN en sí, solo un verificador cifrado,
          y esa clave nunca sale de tu dispositivo — por eso las notas
          cifradas no se pueden leer en otro aparato aunque tengas cuenta.
          Esto depende de que tu propio dispositivo esté protegido: no es
          seguridad de grado bancario.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Tus derechos sobre tus datos</h2>
        <p className="text-sm leading-relaxed text-muted">
          Podés exportar una copia completa de tus datos (incluyendo lo
          sincronizado, si tenés cuenta) o borrar todo en cualquier momento
          desde <strong>Ajustes</strong>. Con cuenta, además podés borrar tu
          cuenta y toda tu información del servidor desde ahí mismo, sin
          pedírnoslo y sin esperar. Nunca vendemos
          ni compartimos tus datos de salud con terceros.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Contacto</h2>
        <p className="text-sm leading-relaxed text-muted">
          Si tenés dudas sobre esta política escribinos por WhatsApp desde el
          botón de contacto de la app. Para borrar tu cuenta no hace falta
          escribirnos: está en <strong>Ajustes</strong>.
        </p>
      </section>

      {/* E6: the same answers as /preguntas, asked for by topic. This is the
          trust moment BUILD-PLAN names — somebody reading a privacy policy is
          exactly who has these questions. */}
      <FaqAccordion
        topics={["privacidad", "cuenta"]}
        title="Preguntas frecuentes"
      />
      <p className="text-sm text-muted">
        Hay más en{" "}
        <Link href="/preguntas" className="font-bold underline">
          preguntas frecuentes
        </Link>
        .
      </p>

      <p className="text-[11px] leading-relaxed text-muted">
        Este texto describe honestamente el funcionamiento actual y planeado
        de la app. No reemplaza asesoría legal formal; está pendiente de
        revisión por un abogado antes del lanzamiento público, y el equipo de
        Mi Bebé lo actualiza a medida que la app cambia.
      </p>
    </article>
  );
}
