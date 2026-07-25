import Link from "next/link";
import type { Metadata } from "next";

// BUILD-PLAN A4. Rewritten for the account world (v3).
//
// The previous version said "no te pide cuenta" and "no tenemos un servidor con
// tu historia clínica". With accounts and sync that is no longer true, and a
// privacy policy that describes the wrong app is worse than none — it is a
// promise the code does not keep.
//
// Structure follows what the code actually does: local-first, optional account,
// what syncs, what never does. DRAFT — a lawyer must review before real users
// sign in (ARCHITECTURE.md §8, REVIEW-AND-LAUNCH-PLAN.md §4.5). Health data
// tied to an identity is a materially higher bar than the device-only version
// this text replaces.
export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Mi Bebé maneja tus datos.",
};

const LAST_UPDATED = "25 de julio de 2026";

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
          En resumen: <strong>Mi Bebé funciona sin cuenta</strong> y todo lo
          que registrás se guarda primero en tu teléfono. Si creás una cuenta,
          copiamos esos registros para que puedas recuperarlos en otro
          teléfono. <strong>Tus fotos nunca se suben</strong>, tengas cuenta o
          no.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Podés usar la app sin cuenta
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Usar Mi Bebé sin cuenta no es una versión recortada: funciona
          completa. En ese modo, todo lo que registrás vive únicamente en el
          almacenamiento de tu navegador (IndexedDB), en este dispositivo. No
          lo vemos, no lo guardamos y no podemos recuperarlo si perdés el
          teléfono — por eso conviene hacer una copia de seguridad desde
          Ajustes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Si creás una cuenta
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Entrás con Google o Facebook. De ellos recibimos únicamente tu{" "}
          <strong>nombre, correo y foto de perfil</strong>. No pedimos ni
          recibimos tu lista de contactos, tus publicaciones ni ningún otro
          permiso.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Antes de guardar nada te pedimos tu consentimiento en una pantalla
          aparte. Recién después copiamos a tu cuenta lo que registrás:
          semanas, fecha probable de parto, síntomas y estado de ánimo, peso,
          pataditas, contracciones, controles, listas, calendario menstrual y
          datos clínicos básicos como grupo sanguíneo y alergias.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Guardamos esa información como un bloque que nuestro servidor no
          analiza: la almacena y te la devuelve. No la usamos para publicidad,
          no la vendemos y no la compartimos con anunciantes ni con los
          negocios del directorio.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Qué nunca sale de tu teléfono
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          <strong>Tus fotos.</strong> Las de la panza y las del carné perinatal
          quedan solo en este dispositivo y no se suben a ningún servidor, ni
          siquiera con cuenta creada. Salen únicamente si vos exportás una
          copia de seguridad, y esa copia queda en tu teléfono.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Si compartís con tu pareja o tu familia
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Podés invitar a alguien a seguir tu embarazo. Esa persona ve un
          resumen — la semana, la fecha probable de parto y el próximo control
          — y nada más. <strong>Nunca</strong> ve tus notas del diario ni tus
          fotos. Podés quitarle el acceso cuando quieras y el cambio es
          inmediato.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Recursos cercanos y WhatsApp
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Para mostrarte sanatorios, ecografías o farmacias cerca tuyo, la app
          consulta nuestro servidor enviando únicamente tu{" "}
          <strong>trimestre</strong> y tu <strong>departamento</strong> —
          nunca tu nombre, tus fechas exactas ni tus síntomas. Cuando tocás un
          botón de WhatsApp te llevamos a wa.me; si registramos ese clic, es
          solo qué recurso tocaste, tu trimestre y tu departamento. Los
          negocios del directorio no reciben ningún dato tuyo.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Estadísticas de contenido
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Contamos cuántas personas leen cada nota por semana de embarazo, para
          saber qué contenido sirve. Ese conteo{" "}
          <strong>no está asociado a vos</strong>: no guardamos usuario,
          sesión ni dirección IP junto a esos números.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Cookies y notificaciones
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Si iniciás sesión usamos una cookie técnica para mantenerte
          conectada. No usamos cookies publicitarias ni rastreadores de
          terceros. Las notificaciones son opcionales, se piden solo desde
          Ajustes y podés elegir qué tipo recibir. Los videos educativos se
          embeben en modo de privacidad mejorada de YouTube
          (youtube-nocookie.com).
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
        <h2 className="text-base font-extrabold text-ink">
          Tus derechos sobre tus datos
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Desde <strong>Ajustes</strong> podés, sin pedirnos permiso:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed text-muted">
          <li>descargar una copia completa de todo lo tuyo;</li>
          <li>borrar los datos de este dispositivo;</li>
          <li>
            borrar tu cuenta, lo que elimina todo lo que guardamos en el
            servidor.
          </li>
        </ul>
        <p className="text-sm leading-relaxed text-muted">
          Borrar los datos del sitio en tu navegador o desinstalar la app
          también elimina lo que está en el dispositivo. Si tenés cuenta, esa
          información sigue en el servidor hasta que borres la cuenta.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Si generás una imagen con inteligencia artificial
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Si usás la función de imagen generada, las fotos que subas para eso
          se envían al servicio que crea la imagen y{" "}
          <strong>no las guardamos</strong>. Guardamos únicamente el resultado
          si vos elegís conservarlo. Es una función de entretenimiento: la
          imagen no predice cómo será tu bebé.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Contacto</h2>
        <p className="text-sm leading-relaxed text-muted">
          Si tenés dudas sobre esta política, escribinos por WhatsApp desde el
          botón de contacto de la app. Ver también los{" "}
          <Link href="/terminos" className="font-extrabold text-terracotta">
            términos de uso
          </Link>
          .
        </p>
      </section>

      <p className="text-[11px] leading-relaxed text-muted">
        Este texto describe honestamente el funcionamiento actual de la app.
        Está pendiente de revisión legal formal antes del lanzamiento público.
      </p>
    </article>
  );
}
