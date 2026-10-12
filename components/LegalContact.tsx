import { APP_NAME } from "@/lib/brand";
import { supportChannels } from "@/lib/support";
import { waLink } from "@/lib/whatsapp";

export function LegalContact() {
  const channels = supportChannels({ NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL, NEXT_PUBLIC_BUSINESS_WHATSAPP: process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP });
  return <p className="text-sm leading-relaxed text-muted">
    Responsable: <strong>Marklund Sales &amp; Marketing AB</strong>, Suecia.
    {channels.email && <> Contacto y privacidad: <a className="font-bold underline" href={`mailto:${channels.email}`}>{channels.email}</a>.</>}
    {channels.whatsapp && <> También podés <a className="font-bold underline" href={waLink(channels.whatsapp, `Hola, tengo una consulta sobre ${APP_NAME} y mis datos.`)}>contactarnos por WhatsApp</a>.</>}
    {!channels.email && !channels.whatsapp && <> El contacto de soporte todavía no está configurado en esta vista previa.</>}
  </p>;
}
