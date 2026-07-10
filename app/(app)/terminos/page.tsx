import type { Metadata } from "next";

// DRAFT terms of use — the founder/legal counsel must review and finalize
// this before public launch (see docs/REVIEW-AND-LAUNCH-PLAN.md §4.6).
export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Condiciones de uso de Mi Bebé.",
};

const LAST_UPDATED = "8 de julio de 2026";

export default function TerminosPage() {
  return (
    <article className="space-y-5">
      <header>
        <h1 className="text-xl font-medium text-petrol-dark">Términos de uso</h1>
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
        <h2 className="text-base font-medium text-ink">Uso de la app</h2>
        <p className="text-sm leading-relaxed text-muted">
          Mi Bebé es gratuita y no requiere crear una cuenta. Al usarla, aceptás
          estos términos y nuestra{" "}
          <a href="/privacidad" className="underline">
            política de privacidad
          </a>. Podés dejar de usarla y borrar tus datos en cualquier momento
          desde Ajustes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-ink">Contenido</h2>
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
        <h2 className="text-base font-medium text-ink">Directorio y recursos</h2>
        <p className="text-sm leading-relaxed text-muted">
          El directorio y los recursos destacados incluyen listados sponsoreados y
          no sponsoreados. Que un sanatorio, profesional o negocio aparezca en
          Mi Bebé no constituye una recomendación médica ni una garantía sobre la
          calidad de su atención — hacé tu propia verificación antes de
          elegir dónde atenderte.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-ink">Límite de responsabilidad</h2>
        <p className="text-sm leading-relaxed text-muted">
          Mi Bebé se ofrece &ldquo;tal cual&rdquo;, sin garantías de
          disponibilidad continua o ausencia de errores. En la medida
          permitida por la ley, no somos responsables por decisiones tomadas
          únicamente en base al contenido de la app sin consultar a un
          profesional.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-ink">Cambios</h2>
        <p className="text-sm leading-relaxed text-muted">
          Podemos actualizar estos términos a medida que la app crece. Los
          cambios importantes se reflejarán en esta página con su fecha de
          actualización.
        </p>
      </section>
    </article>
  );
}
