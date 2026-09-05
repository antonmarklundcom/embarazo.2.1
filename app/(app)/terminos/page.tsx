import type { Metadata } from "next";

// Terms of use for the account world (v3 pivot — accounts + sync). See
// DECISIONS.md "v3 pivot". DRAFT — pending lawyer review before public
// launch (see docs/REVIEW-AND-LAUNCH-PLAN.md §4.5).
export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Condiciones de uso de Mi Bebé.",
};

const LAST_UPDATED = "12 de agosto de 2026";

export default function TerminosPage() {
  return (
    <article className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Términos de uso</h1>
        <p className="mt-1 text-xs text-muted">
          Última actualización: {LAST_UPDATED}
        </p>
        <p className="mt-2 text-xs text-muted">
          Este texto fue redactado con asistencia de inteligencia artificial y
          todavía no fue revisado por un abogado.
        </p>
      </header>

      <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
        <p className="text-sm leading-relaxed text-ink">
          Mi Bebé es una herramienta informativa y de acompañamiento durante el
          embarazo y la búsqueda de embarazo. <strong>No reemplaza la
          atención de un profesional de la salud, no realiza diagnósticos y
          no da indicaciones médicas personalizadas.</strong> Ante cualquier
          duda o síntoma, contactá a tu sanatorio, tu médico/a o un servicio
          de emergencia.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Uso de la app, con o sin cuenta</h2>
        <p className="text-sm leading-relaxed text-muted">
          Mi Bebé es gratuita. Podés usarla sin crear una cuenta — &ldquo;seguir
          sin cuenta&rdquo; es una forma completa de usar la app, no un modo
          reducido — o crear una cuenta con Google (o Facebook, cuando esté
          disponible) para sincronizar tus datos entre dispositivos. Al usarla,
          aceptás estos términos y nuestra{" "}
          <a href="/privacidad" className="underline">
            política de privacidad
          </a>. Si creás una cuenta, además aceptás explícitamente que
          guardemos tus datos de salud del embarazo en nuestro servidor, en el
          paso de permiso de la pantalla de cuenta.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Tu cuenta</h2>
        <p className="text-sm leading-relaxed text-muted">
          Sos responsable de mantener el acceso a la cuenta con la que iniciás
          sesión (Google o Facebook). Podés cerrar sesión, borrar tu cuenta y
          todos tus datos del servidor, o dejar de usar la app en cualquier
          momento desde Ajustes. Si compartís tu embarazo con tu pareja o
          familia, sos responsable de a quién le das ese acceso; podés
          revocarlo cuando quieras.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Contenido</h2>
        <p className="text-sm leading-relaxed text-muted">
          Las guías, la información semanal y las señales de alarma son
          contenido general de referencia, revisado por nuestro equipo
          médico, pero no consideran tu historia clínica particular. La
          información sobre derechos laborales y trámites es general y
          orientativa: para tu situación específica, consultá a un
          profesional del derecho o a la institución correspondiente (IPS,
          Registro Civil, MSPBS).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">La imagen de bebé con IA</h2>
        <p className="text-sm leading-relaxed text-muted">
          Cuando esté disponible, &ldquo;así podría ser tu bebé&rdquo; es una
          función de entretenimiento opcional generada por inteligencia
          artificial a partir de fotos que vos subís voluntariamente. No es
          una predicción real de la apariencia de tu bebé ni tiene ningún fin
          médico. El uso está sujeto a un cupo mensual y puede desactivarse en
          cualquier momento.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Directorio y recursos</h2>
        <p className="text-sm leading-relaxed text-muted">
          El directorio y los recursos destacados incluyen listados sponsoreados y
          no sponsoreados. Que un sanatorio, profesional o negocio aparezca en
          Mi Bebé no constituye una recomendación médica ni una garantía sobre la
          calidad de su atención — hacé tu propia verificación antes de
          elegir dónde atenderte.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Límite de responsabilidad</h2>
        <p className="text-sm leading-relaxed text-muted">
          Mi Bebé se ofrece &ldquo;tal cual&rdquo;, sin garantías de
          disponibilidad continua o ausencia de errores. En la medida
          permitida por la ley, no somos responsables por decisiones tomadas
          únicamente en base al contenido de la app sin consultar a un
          profesional.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Cambios</h2>
        <p className="text-sm leading-relaxed text-muted">
          Podemos actualizar estos términos a medida que la app crece. Los
          cambios importantes se reflejarán en esta página con su fecha de
          actualización; si cambiamos qué datos guardamos con cuenta, también
          actualizamos el paso de permiso y te pedimos aceptarlo de nuevo.
        </p>
      </section>

      <p className="text-[11px] leading-relaxed text-muted">
        Este texto describe honestamente el funcionamiento actual y planeado
        de la app. No reemplaza asesoría legal formal; está pendiente de
        revisión por un abogado antes del lanzamiento público.
      </p>
    </article>
  );
}
