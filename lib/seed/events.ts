import type { EventItem } from "../types";
import { publishedOnly } from "./gate";

// PLACEHOLDER curated events (build spec §7). Titles, venues, organizers and
// phone numbers are invented; +595 numbers are non-working examples. Events are
// CURATED seed data only — never user-posted. Replace with real, consented
// events before launch.
//
// Dates are anchored relative to "today" at module load so the demo list keeps
// a realistic mix of upcoming and past events. For real data, use fixed
// epoch-millisecond timestamps instead.

const DAY = 86_400_000;
const NOW = Date.now();
function inDays(n: number): number {
  // Normalize to ~18:30 local so cards read like real evening events.
  const d = new Date(NOW + n * DAY);
  d.setHours(18, 30, 0, 0);
  return d.getTime();
}

export const EVENTS: EventItem[] = [
  {
    id: "evt-001",
    title: "Charla prenatal: tu primer trimestre (placeholder)",
    type: "charla",
    department: "capital",
    city: "Asunción",
    venue: "Centro de Salud Familiar (placeholder)",
    date: inDays(4),
    description:
      "Charla gratuita sobre los controles, la alimentación y las dudas más comunes del primer trimestre.",
    organizer: "Equipo de Mi Bebé (placeholder)",
    whatsappNumber: "+595981000050",
    mapsUrl: "https://maps.google.com/?q=Asuncion+Paraguay",
    isSponsored: true,
  },
  {
    id: "evt-002",
    title: "Taller de lactancia materna (placeholder)",
    type: "taller",
    department: "central",
    city: "San Lorenzo",
    venue: "Sala comunitaria (placeholder)",
    date: inDays(9),
    description:
      "Taller práctico sobre el inicio de la lactancia, posiciones y resolución de dudas frecuentes.",
    organizer: "Grupo de apoyo a la lactancia (placeholder)",
    whatsappNumber: "+595981000051",
    mapsUrl: "https://maps.google.com/?q=San+Lorenzo+Paraguay",
    isSponsored: false,
  },
  {
    id: "evt-003",
    title: "Clase de preparación al parto (placeholder)",
    type: "clase",
    department: "central",
    city: "Luque",
    venue: "Sanatorio del Sol (placeholder)",
    date: inDays(14),
    description:
      "Encuentro para preparar el trabajo de parto: respiración, posiciones y qué llevar al sanatorio.",
    organizer: "Sanatorio del Sol (placeholder)",
    whatsappNumber: "+595981000052",
    mapsUrl: "https://maps.google.com/?q=Luque+Paraguay",
    isSponsored: false,
  },
  {
    id: "evt-004",
    title: "Feria de bebés y embarazadas (placeholder)",
    type: "feria",
    department: "capital",
    city: "Asunción",
    venue: "Salón de eventos (placeholder)",
    date: inDays(20),
    description:
      "Feria con productos para el embarazo y el bebé, emprendimientos locales y stands de información.",
    organizer: "Colectivo de mamás emprendedoras (placeholder)",
    mapsUrl: "https://maps.google.com/?q=Asuncion+Paraguay",
    isSponsored: false,
  },
  {
    id: "evt-005",
    title: "Encuentro de mamás de Alto Paraná (placeholder)",
    type: "encuentro",
    department: "alto-parana",
    city: "Ciudad del Este",
    venue: "Plaza central (placeholder)",
    date: inDays(11),
    description:
      "Encuentro abierto para compartir experiencias del embarazo y la crianza en un espacio relajado.",
    organizer: "Red de mamás del Este (placeholder)",
    whatsappNumber: "+595981000053",
    mapsUrl: "https://maps.google.com/?q=Ciudad+del+Este+Paraguay",
    isSponsored: false,
  },
  {
    id: "evt-006",
    title: "Charla: lactancia y vuelta al trabajo (placeholder)",
    type: "charla",
    department: "itapua",
    city: "Encarnación",
    venue: "Biblioteca municipal (placeholder)",
    date: inDays(25),
    description:
      "Cómo organizar la extracción y conservación de leche al volver al trabajo, con tiempo y sin estrés.",
    organizer: "Consultora en lactancia (placeholder)",
    whatsappNumber: "+595981000054",
    mapsUrl: "https://maps.google.com/?q=Encarnacion+Paraguay",
    isSponsored: false,
  },
  {
    id: "evt-007",
    title: "Taller de porteo seguro (placeholder)",
    type: "taller",
    department: "central",
    city: "Fernando de la Mora",
    venue: "Espacio de crianza (placeholder)",
    date: inDays(30),
    description:
      "Aprendé a usar fular y mochila ergonómica de forma segura para vos y tu bebé.",
    organizer: "Espacio de crianza (placeholder)",
    whatsappNumber: "+595981000055",
    mapsUrl: "https://maps.google.com/?q=Fernando+de+la+Mora+Paraguay",
    isSponsored: false,
  },
  {
    id: "evt-008",
    title: "Charla prenatal del mes pasado (placeholder)",
    type: "charla",
    department: "capital",
    city: "Asunción",
    venue: "Centro comunitario (placeholder)",
    date: inDays(-12),
    description:
      "Evento ya realizado, incluido para mostrar cómo se ven los encuentros pasados en la lista.",
    organizer: "Equipo de Mi Bebé (placeholder)",
    isSponsored: false,
  },
];

// Placeholder gate (BUILD-PLAN Z1) — the app renders PUBLISHED_EVENTS, never
// EVENTS. Every entry above is currently invented, so the Eventos tab shows its
// empty state until real, consented events land. Real events must also carry
// FIXED epoch-millisecond timestamps rather than the module-load-relative
// `inDays()` demo dates, which drift with every deploy.
export const PUBLISHED_EVENTS: EventItem[] = publishedOnly(EVENTS);
