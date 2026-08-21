import Link from "next/link";
import type { Metadata } from "next";

import { supportChannels } from "@/lib/support";
import { waLink } from "@/lib/whatsapp";

// The public account-deletion page Google Play requires
// (`docs/ANDROID-LAUNCH.md` §3.3).
//
// Play wants **two** deletion paths and the app only had one. A5 built the
// in-app route (Ajustes → "Borrar mi cuenta"); this is the other: a URL that
// works **without installing the app and without signing in**, submitted in
// the Data safety form. It is the requirement people forget and get rejected
// for.
//
// ## Why there is no form here
//
// The obvious build is a box that takes an email address and deletes the
// account. That would be an **unauthenticated deletion endpoint** — a way for
// anyone to erase somebody else's pregnancy by typing their address. No amount
// of rate limiting fixes it, because the request is indistinguishable from the
// real one.
//
// So this page describes a human process, and A5's authenticated path stays
// the only mechanism that deletes anything. Play asks for a way to *request*
// deletion, which is exactly what this is.
//
// ## Why it lives outside `(app)`
//
// Same reason `/conoce` does: no bottom nav, no SOS pill, no profile reads.
// Someone arriving here from a store listing may have no app, no account and
// no idea what the product is. It is also a plain server component with no
// client JavaScript — the page has to render for a Play reviewer, a browser
// with JS disabled, and a woman on a borrowed phone.

export const metadata: Metadata = {
  title: "Borrar tu cuenta y tus datos — Mi Bebé",
  description:
    "Cómo borrar tu cuenta de Mi Bebé y todos tus datos, desde la app o escribiéndonos, sin instalar nada.",
  alternates: { canonical: "/borrar-cuenta" },
};

/**
 * What deletion removes, in the words of the thing that removes it.
 *
 * Kept deliberately close to `TABLE_DISPOSITION` in `lib/server/account.ts`,
 * which is the actual plan A5 executes. The one entry that surprises people is
 * the last: an approved question is public FAQ content by then, and it still
 * goes, because her words are hers (K20).
 */
const WHAT_GOES = [
  "Tu cuenta y tu forma de iniciar sesión.",
  "Tus registros de salud sincronizados: síntomas, ánimo, peso, diario, controles.",
  "Tus fotos de la panza y del carné, si activaste la copia de seguridad — el archivo, no solo el enlace.",
  "Tu embarazo compartido, y el acceso de tu pareja o familia a él.",
  "Tus recordatorios y la suscripción de notificaciones de tus dispositivos.",
  "Las preguntas que nos mandaste, incluso las que ya publicamos respondidas.",
];

export default function BorrarCuentaPage() {
  // Read at render time on the server: nothing about this page is per-user, so
  // it is one static page for everybody. A build with no channel configured
  // cannot be deployed — `lib/launchChecks.ts` fails it, rather than letting
  // this page tell somebody to contact nobody.
  const channels = supportChannels({
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
    NEXT_PUBLIC_BUSINESS_WHATSAPP: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP,
  });

  const waMessage =
    "Hola. Quiero borrar mi cuenta de Mi Bebé y todos mis datos. " +
    "Este es el correo con el que la creé:";

  return (
    <main className="mx-auto min-h-dvh max-w-2xl bg-cream px-5 py-10 text-ink">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Mi Bebé
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        Borrar tu cuenta y tus datos
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink/90">
        Podés borrar tu cuenta de Mi Bebé y todo lo que guardamos de vos cuando
        quieras, sin dar explicaciones. Hay dos formas: desde la app, o
        escribiéndonos — para esto último no hace falta instalar nada ni tener
        la app abierta.
      </p>

      {/* Path 1: in-app, the one that actually executes the deletion. */}
      <section className="mt-8 rounded-card bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Si tenés la app instalada</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/90">
          Es inmediato y no pasa por nosotros:
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink/90">
          <li>Abrí Mi Bebé y entrá en <strong>Ajustes</strong>.</li>
          <li>Bajá hasta <strong>&ldquo;Borrar mi cuenta&rdquo;</strong>.</li>
          <li>
            Confirmá. En el mismo paso podés borrar también los datos guardados
            en tu teléfono.
          </li>
        </ol>
      </section>

      {/* Path 2: the one Play asks for. */}
      <section className="mt-4 rounded-card bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">
          Si no tenés la app, o preferís que lo hagamos nosotros
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/90">
          Escribinos desde el <strong>mismo correo con el que creaste la
          cuenta</strong> — es la única forma que tenemos de saber que la cuenta
          es tuya y no de otra persona — y pedinos que la borremos.
        </p>

        <div className="mt-4 space-y-2">
          {/* Only reachable in a local build with nothing configured: a
              deployment with no channel cannot be built at all
              (lib/launchChecks.ts). Rendered rather than left blank so the
              gap is obvious to whoever is running the app, instead of a
              section that silently says "write to us" and shows nothing. */}
          {!channels.email && !channels.whatsapp && (
            <p className="rounded-tile border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm font-semibold text-terracotta">
              Falta configurar NEXT_PUBLIC_SUPPORT_EMAIL o
              NEXT_PUBLIC_BUSINESS_WHATSAPP. Esta build no se puede desplegar
              así.
            </p>
          )}
          {channels.email && (
            <a
              href={`mailto:${channels.email}?subject=${encodeURIComponent(
                "Borrar mi cuenta de Mi Bebé",
              )}`}
              className="flex min-h-[48px] items-center justify-center rounded-tile bg-petrol px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              Escribir a {channels.email}
            </a>
          )}
          {channels.whatsapp && (
            <a
              href={waLink(channels.whatsapp, waMessage)}
              className="flex min-h-[48px] items-center justify-center rounded-tile bg-whatsapp px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              Escribir por WhatsApp
            </a>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink/90">
          Respondemos y borramos la cuenta <strong>dentro de los 30 días</strong>,
          normalmente mucho antes. Te avisamos cuando esté hecho.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          No te vamos a pedir tu contraseña ni datos de salud para borrar tu
          cuenta. Si alguien te los pide diciendo que es de Mi Bebé, no es
          nuestro.
        </p>
      </section>

      <section className="mt-4 rounded-card border border-line bg-white p-5">
        <h2 className="text-lg font-extrabold">Qué se borra</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink/90">
          {WHAT_GOES.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-petrol" aria-hidden>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-ink/90">
          Se borra del servidor: no nos queda una copia. La única excepción es
          el <strong>registro de acciones administrativas</strong> — queda
          constancia de que alguien de nuestro equipo hizo una acción y cuándo,
          sin tu nombre, sin tu correo y sin nada de tus datos de salud. Sin eso
          no podríamos demostrar qué se hizo con tu pedido.
        </p>
        <p className="mt-3 rounded-tile bg-sand-bg px-3 py-2 text-sm leading-relaxed text-sand-text">
          <strong>Lo que está solo en tu teléfono se queda en tu teléfono.</strong>{" "}
          Si usaste Mi Bebé sin cuenta, nunca tuvimos nada tuyo que borrar: para
          eliminar esos datos, borralos desde Ajustes en la app o desinstalala.
        </p>
      </section>

      <p className="mt-8 text-sm text-muted">
        Ver también la{" "}
        <Link href="/privacidad" className="font-bold underline">
          política de privacidad
        </Link>{" "}
        y los{" "}
        <Link href="/terminos" className="font-bold underline">
          términos de uso
        </Link>
        .{" "}
        <Link href="/conoce" className="font-bold underline">
          Qué es Mi Bebé
        </Link>
        .
      </p>
    </main>
  );
}
