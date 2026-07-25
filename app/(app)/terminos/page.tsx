import type { Metadata } from "next";

// BUILD-PLAN A4. Updated for the account world (v3): the previous version said
// the app "no requiere crear una cuenta" as a flat statement, which stopped
// being true, and said nothing about accounts, sharing, deletion or the AI
// feature. DRAFT — a lawyer must review before real users sign in
// (ARCHITECTURE.md §8, REVIEW-AND-LAUNCH-PLAN.md §4.5).
export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Condiciones de uso de Mi Bebé.",
};

const LAST_UPDATED = "25 de julio de 2026";

export default function TerminosPage() {
  return (
    <article className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Términos de uso</h1>
        <p className="mt-1 text-xs text-muted">
          Última actualización: {LAST_UPDATED}
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
        <h2 className="text-base font-extrabold text-ink">Uso de la app</h2>
        <p className="text-sm leading-relaxed text-muted">
          Mi Bebé es gratuita. Podés usarla{" "}
          <strong>sin crear una cuenta</strong> — funciona completa así — o
          crear una para que tus registros se copien y puedas recuperarlos en
          otro teléfono. Al usarla aceptás estos términos y nuestra{" "}
          <a href="/privacidad" className="underline">
            política de privacidad
          </a>
          . Podés dejar de usarla y borrar tus datos en cualquier momento desde
          Ajustes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Tu cuenta</h2>
        <p className="text-sm leading-relaxed text-muted">
          La cuenta es personal. Sos responsable del acceso a tu correo de
          Google o Facebook, porque quien entre ahí puede entrar a tu cuenta de
          Mi Bebé. Antes de guardar tu información de salud te pedimos tu
          consentimiento en una pantalla aparte; si no lo das, seguís usando la
          app sin cuenta.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          Podés borrar tu cuenta cuando quieras desde Ajustes. Al hacerlo
          eliminamos lo que guardamos en el servidor. Lo que esté en tu
          teléfono lo borrás vos en el mismo paso, si querés.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Compartir con tu pareja o tu familia
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Si invitás a alguien, esa persona ve un resumen de tu embarazo —
          nunca tus notas ni tus fotos. Invitá solo a quien quieras que lo vea:
          la invitación es tuya y podés revocarla en cualquier momento.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          Imágenes generadas con inteligencia artificial
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          La imagen generada es <strong>entretenimiento</strong>: no predice
          cómo será tu bebé ni tiene valor médico de ningún tipo. Solo podés
          subir fotos propias o de personas que te hayan autorizado. Puede
          haber un límite de generaciones por mes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Contenido</h2>
        <p className="text-sm leading-relaxed text-muted">
          Las guías, la información semanal y las señales de alarma son
          contenido general de referencia y no consideran tu historia clínica
          particular. Cuando una nota fue revisada por un profesional, lo
          indicamos con su nombre al pie. La
          información sobre derechos laborales y trámites es general y
          orientativa: para tu situación específica, consultá a un
          profesional del derecho o a la institución correspondiente (IPS,
          Registro Civil, MSPBS).
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
        <h2 className="text-base font-extrabold text-ink">
          Disponibilidad del servicio
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          La app funciona sin conexión para lo que ya tenés guardado. La copia
          a tu cuenta necesita internet y puede demorar o fallar; por eso tus
          datos se guardan siempre primero en tu teléfono, y te recomendamos
          hacer una copia de seguridad de vez en cuando desde Ajustes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">Cambios</h2>
        <p className="text-sm leading-relaxed text-muted">
          Podemos actualizar estos términos a medida que la app crece. Los
          cambios importantes se reflejarán en esta página con su fecha de
          actualización. Si el cambio afecta cómo tratamos tu información de
          salud, te lo pedimos de nuevo dentro de la app en lugar de darlo por
          aceptado.
        </p>
      </section>
    </article>
  );
}
