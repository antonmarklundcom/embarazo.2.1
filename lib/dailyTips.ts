import type { Trimester } from "./types";

// Pool of short, useful es-PY tips (build spec §3). Paraguay-aware where it
// reads naturally (calor, tereré, dengue, alimentación de estación, controles).
// No backend, no external source — this is a static, curated pool.
//
// `trimester` 0 = applies to any trimester. Informational, never diagnostic.

export interface DailyTip {
  id: string;
  text: string;
  trimester: 0 | Trimester;
}

export const DAILY_TIPS: DailyTip[] = [
  // --- General (any trimester) ---
  { id: "t-01", trimester: 0, text: "Tomá agua seguido durante el día. Con el calor de acá, la hidratación cuida tu cuerpo y al bebé." },
  { id: "t-02", trimester: 0, text: "El tereré acompaña, pero con moderación: que no reemplace al agua y evitá yuyos sin consultar." },
  { id: "t-03", trimester: 0, text: "Vaciá baldes, floreros y cubiertas con agua estancada. Prevenir el mosquito del dengue también es cuidarte." },
  { id: "t-04", trimester: 0, text: "Usá repelente seguro para embarazadas y mosquitero si dormís con ventanas abiertas." },
  { id: "t-05", trimester: 0, text: "Aprovechá las frutas de estación: mango, mamón, sandía y cítricos suman vitaminas y te hidratan." },
  { id: "t-06", trimester: 0, text: "Lavá bien frutas y verduras antes de comerlas, sobre todo si las comprás en la feria." },
  { id: "t-07", trimester: 0, text: "Si hace mucho calor, salí temprano o al atardecer y buscá la sombra para tus caminatas." },
  { id: "t-08", trimester: 0, text: "Llevá siempre tu carné perinatal a los controles: es tu historia del embarazo en la mano." },
  { id: "t-09", trimester: 0, text: "Dormí del lado izquierdo cuando puedas: mejora la circulación hacia el bebé." },
  { id: "t-10", trimester: 0, text: "Movete un poco cada día: una caminata suave ayuda a la digestión y al ánimo." },
  { id: "t-11", trimester: 0, text: "Anotá tus dudas en el celular durante la semana y llevalas a tu próximo control." },
  { id: "t-12", trimester: 0, text: "Descansá sin culpa. El cansancio es parte del embarazo y tu cuerpo está trabajando mucho." },
  { id: "t-13", trimester: 0, text: "Comé porciones más chicas y seguido si sentís pesadez: ayuda con la digestión." },
  { id: "t-14", trimester: 0, text: "Evitá el alcohol y el cigarrillo durante todo el embarazo. No hay cantidad segura." },
  { id: "t-15", trimester: 0, text: "Cuidá tu piel del sol fuerte: usá protector y ropa fresca de colores claros." },
  { id: "t-16", trimester: 0, text: "Hablar de cómo te sentís ayuda. Apoyate en tu pareja, familia o amigas de confianza." },
  { id: "t-17", trimester: 0, text: "Si trabajás muchas horas de pie, buscá momentos para sentarte y elevar las piernas." },
  { id: "t-18", trimester: 0, text: "Guardá a mano el contacto de tu sanatorio y la dirección, por si necesitás ir rápido." },

  // --- First trimester ---
  { id: "t-19", trimester: 1, text: "Seguí tomando el ácido fólico todos los días: es clave en estas primeras semanas." },
  { id: "t-20", trimester: 1, text: "Para las náuseas, probá galletitas o algo seco apenas te despertás, antes de levantarte." },
  { id: "t-21", trimester: 1, text: "Si los olores fuertes te marean, ventilá la cocina y comé alimentos a temperatura ambiente." },
  { id: "t-22", trimester: 1, text: "Es normal sentir más sueño. Si podés, hacé una siesta corta para recuperar energía." },

  // --- Second trimester ---
  { id: "t-23", trimester: 2, text: "Aprovechá este trimestre, que muchas se sienten mejor, para organizar tus controles y estudios." },
  { id: "t-24", trimester: 2, text: "Si aparece dolor de espalda, cuidá la postura y probá una almohada entre las rodillas al dormir." },
  { id: "t-25", trimester: 2, text: "Empezá a hidratar la piel de la panza: no evita del todo las estrías, pero alivia la tirantez." },
  { id: "t-26", trimester: 2, text: "Cerca de las semanas 18 a 22 suele hacerse la eco morfológica. Coordiná tu turno con tiempo." },

  // --- Third trimester ---
  { id: "t-27", trimester: 3, text: "Prestá atención a los movimientos del bebé. Si notás menos pataditas que de costumbre, consultá." },
  { id: "t-28", trimester: 3, text: "Empezá a preparar el bolso para el sanatorio así no corrés a último momento." },
  { id: "t-29", trimester: 3, text: "Para la hinchazón de piernas, elevá los pies un rato y evitá estar mucho tiempo parada." },
  { id: "t-30", trimester: 3, text: "Conocé las señales de trabajo de parto y tené claro a qué teléfono llamar y cómo llegar al sanatorio." },
  { id: "t-31", trimester: 3, text: "Descansá cuando puedas: dormir de a ratos ahora es normal y te prepara para lo que viene." },
];

/** Day-of-year (1..366) for deterministic, stable-within-a-day selection. */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/**
 * Deterministic tip of the day (build spec §3): stable within a day, changes
 * daily. Prefers tips for the current trimester but always falls back to the
 * full pool so every day has a tip. No network.
 */
export function getDailyTip(
  week: number,
  trimester: Trimester,
  now: Date = new Date(),
): DailyTip {
  const seed = dayOfYear(now) + week;
  const pool = DAILY_TIPS.filter(
    (t) => t.trimester === 0 || t.trimester === trimester,
  );
  const list = pool.length > 0 ? pool : DAILY_TIPS;
  return list[seed % list.length] ?? FALLBACK_TIP;
}

const FALLBACK_TIP: DailyTip = {
  id: "t-fallback",
  trimester: 0,
  text: "Tomá agua seguido y descansá cuando puedas. Tu cuerpo está trabajando mucho.",
};
