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
  { id: "t-18", trimester: 0, text: "Guardá a mano el contacto de tu hospital o sanatorio y la dirección, por si necesitás ir rápido." },

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
  { id: "t-28", trimester: 3, text: "Empezá a preparar el bolso para el parto así no corrés a último momento." },
  { id: "t-29", trimester: 3, text: "Para la hinchazón de piernas, elevá los pies un rato y evitá estar mucho tiempo parada." },
  { id: "t-30", trimester: 3, text: "Conocé las señales de trabajo de parto y tené claro a qué teléfono llamar y cómo llegar al hospital o sanatorio." },
  { id: "t-31", trimester: 3, text: "Descansá cuando puedas: dormir de a ratos ahora es normal y te prepara para lo que viene." },

  // --- Growth plan item 10 (2026-09-27): 72 more, pending medical review
  // (docs/decisions-needed.md). Same rules: es-PY voseo, concrete, no doses,
  // never "wait and see"; ranges match the week and trimester content. ---
  { id: "t-32", trimester: 0, text: "Si notás sangrado, dolor fuerte, fiebre o pérdida de líquido, no esperes al próximo control: consultá ese mismo día." },
  { id: "t-33", trimester: 0, text: "Antes de tomar cualquier remedio, aunque sea de venta libre, consultá con tu médico/a o en la farmacia." },
  { id: "t-34", trimester: 0, text: "Los yuyos también son remedios: preguntá antes de sumarlos al mate o al tereré." },
  { id: "t-35", trimester: 0, text: "Preguntá en tu control qué vacunas te corresponden durante el embarazo según el calendario vigente." },
  { id: "t-36", trimester: 0, text: "Cepillate los dientes después de comer y usá hilo dental: en el embarazo las encías pueden sangrar más." },
  { id: "t-37", trimester: 0, text: "Lavate las manos antes de cocinar y después de tocar carne cruda, tierra o el arenero del gato." },
  { id: "t-38", trimester: 0, text: "Si tenés gato, que otra persona limpie el arenero; si lo hacés vos, usá guantes y lavate las manos después." },
  { id: "t-39", trimester: 0, text: "Cociná bien la carne, el pollo y los huevos: la carne jugosa y el huevo crudo, mejor dejarlos para después." },
  { id: "t-40", trimester: 0, text: "Elegí leche y quesos pasteurizados. Si no sabés cómo se hizo un queso casero, mejor evitarlo o cocinarlo bien." },
  { id: "t-41", trimester: 0, text: "Guardá las comidas en la heladera y no dejes sobras mucho tiempo al calor." },
  { id: "t-42", trimester: 0, text: "En el auto, la banda de abajo del cinturón va por debajo de la panza, sobre la cadera, y la de arriba entre los pechos." },
  { id: "t-43", trimester: 0, text: "Si te cuesta dormir, probá acostarte siempre a la misma hora y dejar el celular un rato antes." },
  { id: "t-44", trimester: 0, text: "Si sentís tristeza o angustia la mayor parte del día, contalo en tu control: también es parte de tu salud." },
  { id: "t-45", trimester: 0, text: "Respirá hondo unos minutos al día: inhalá lento por la nariz y soltá el aire despacio. Ayuda a bajar la tensión." },
  { id: "t-46", trimester: 0, text: "Los ejercicios de Kegel fortalecen el piso pélvico; en la app tenés una guía paso a paso." },
  { id: "t-47", trimester: 0, text: "Usá calzado bajo y firme: te da más estabilidad a medida que cambia tu equilibrio." },
  { id: "t-48", trimester: 0, text: "Si trabajás con productos químicos o plaguicidas, contalo en tu control para ver cómo protegerte." },
  { id: "t-49", trimester: 0, text: "Evitá los baños de agua muy caliente y el sauna mientras estés embarazada." },
  { id: "t-50", trimester: 0, text: "Pedí ayuda con las tareas pesadas de la casa, como cargar bidones o baldes de agua." },
  { id: "t-51", trimester: 0, text: "Las legumbres como porotos, lentejas y garbanzos suman hierro y fibra a tus comidas." },
  { id: "t-52", trimester: 0, text: "Acompañá las comidas con una fruta cítrica: ayuda a aprovechar mejor el hierro de los alimentos." },
  { id: "t-53", trimester: 0, text: "El café, el cocido y el mate también tienen cafeína: tenelo en cuenta al sumar lo que tomás en el día." },
  { id: "t-54", trimester: 0, text: "Si fumás y te cuesta dejar, pedí ayuda en tu control: dejar en cualquier momento del embarazo suma." },
  { id: "t-55", trimester: 0, text: "Registrar tu peso de vez en cuando ayuda a conversar con tu equipo; no hace falta pesarte todos los días." },
  { id: "t-56", trimester: 1, text: "Si todavía no tuviste tu primer control, pedilo ahora: no hace falta esperar a que se note la panza." },
  { id: "t-57", trimester: 1, text: "Para tu primer control, llevá la fecha de tu última menstruación y la lista de remedios que usás." },
  { id: "t-58", trimester: 1, text: "Las náuseas suelen mejorar hacia el final del primer trimestre, aunque no en todas pasa igual." },
  { id: "t-59", trimester: 1, text: "Si vomitás todo lo que comés o tomás, o casi no orinás, consultá pronto: no es algo para aguantar." },
  { id: "t-60", trimester: 1, text: "Si el agua te cae mal con las comidas, tomala de a sorbos entre una comida y otra." },
  { id: "t-61", trimester: 1, text: "A algunas mujeres les ayudan las galletitas de agua o una infusión suave de jengibre para las náuseas." },
  { id: "t-62", trimester: 1, text: "Es común orinar más seguido al principio: no dejes de tomar agua por eso." },
  { id: "t-63", trimester: 1, text: "Si tus pechos están sensibles, un corpiño cómodo y sin aro suele aliviar." },
  { id: "t-64", trimester: 1, text: "Un dolor fuerte de un lado de la panza, con o sin sangrado, necesita atención enseguida." },
  { id: "t-65", trimester: 1, text: "Revisá con tu equipo los remedios que usabas antes del embarazo; no los suspendas por tu cuenta." },
  { id: "t-66", trimester: 1, text: "Los análisis de sangre y orina del comienzo sirven para cuidarte, aunque te sientas bien." },
  { id: "t-67", trimester: 1, text: "Contá en el control si tuviste embarazos anteriores o alguna enfermedad crónica, aunque parezca un detalle." },
  { id: "t-68", trimester: 1, text: "Los cambios de ánimo son frecuentes al principio. Darte tiempo y hablarlo ayuda." },
  { id: "t-69", trimester: 1, text: "Si todavía no le contaste a nadie, está bien: vos elegís cuándo compartir la noticia." },
  { id: "t-70", trimester: 1, text: "Alrededor de las 11 a 14 semanas se ofrecen algunos estudios; preguntá cuáles corresponden en tu caso." },
  { id: "t-71", trimester: 1, text: "Si te duele la cabeza, no te automediques: preguntá en tu control qué podés tomar." },
  { id: "t-72", trimester: 2, text: "Muchas empiezan a sentir las pataditas entre las semanas 16 y 24; en el primer embarazo puede tardar más." },
  { id: "t-73", trimester: 2, text: "Si a las 24 semanas todavía no sentiste movimientos, avisá a tu equipo." },
  { id: "t-74", trimester: 2, text: "Entre las 24 y 28 semanas suele plantearse el estudio de glucosa: preguntá cómo prepararte." },
  { id: "t-75", trimester: 2, text: "Para la acidez, comé despacio y en porciones chicas, y esperá un rato antes de acostarte." },
  { id: "t-76", trimester: 2, text: "Si se te acalambra la pierna de noche, estirá la pantorrilla llevando la punta del pie hacia vos." },
  { id: "t-77", trimester: 2, text: "Un almohadón bajo la panza y otro entre las rodillas ayudan a dormir de costado." },
  { id: "t-78", trimester: 2, text: "Es buen momento para averiguar dónde vas a tener a tu bebé y qué documentos te piden." },
  { id: "t-79", trimester: 2, text: "Si vas a tomar licencia por maternidad, empezá a organizar los papeles con tiempo." },
  { id: "t-80", trimester: 2, text: "Para la constipación, sumá frutas, verduras, legumbres y agua a lo largo del día." },
  { id: "t-81", trimester: 2, text: "Si tenés las encías inflamadas, es un buen momento para una consulta con el dentista." },
  { id: "t-82", trimester: 2, text: "Una guía simple para el ejercicio: moverte a un ritmo en el que todavía puedas conversar." },
  { id: "t-83", trimester: 2, text: "Evitá los deportes con riesgo de caídas o de golpes en la panza." },
  { id: "t-84", trimester: 2, text: "Hablale y cantale al bebé: ya empieza a oír sonidos." },
  { id: "t-85", trimester: 2, text: "Si tu pareja quiere participar, invitala a un control o a sentir las pataditas con vos." },
  { id: "t-86", trimester: 2, text: "Anotá en qué momentos del día el bebé se mueve más: te ayuda a conocer su ritmo." },
  { id: "t-87", trimester: 2, text: "Si la panza se pone dura seguido o con dolor, contalo en tu control o consultá antes." },
  { id: "t-88", trimester: 3, text: "No hace falta contar pataditas todo el día; lo importante es notar si cambia su ritmo habitual." },
  { id: "t-89", trimester: 3, text: "Las contracciones de práctica suelen ser irregulares y ceder con reposo; si se vuelven regulares y más fuertes, consultá." },
  { id: "t-90", trimester: 3, text: "Si perdés líquido por la vagina, aunque sea poco y sin dolor, consultá." },
  { id: "t-91", trimester: 3, text: "Antes de las 37 semanas, contracciones regulares, sangrado o pérdida de líquido necesitan atención enseguida." },
  { id: "t-92", trimester: 3, text: "Un dolor de cabeza fuerte que no se va, visión borrosa o hinchazón de golpe en cara o manos: consultá ese mismo día." },
  { id: "t-93", trimester: 3, text: "Tené listos los documentos para el parto: cédula, carné perinatal y los estudios que tengas." },
  { id: "t-94", trimester: 3, text: "Dejá pensado cómo llegar al hospital o sanatorio y quién te va a llevar, de día y de noche." },
  { id: "t-95", trimester: 3, text: "En la app podés anotar tus contracciones para saber cada cuánto vienen." },
  { id: "t-96", trimester: 3, text: "Si te falta el aire al acostarte, probá dormir un poco más reclinada con almohadas." },
  { id: "t-97", trimester: 3, text: "Preguntá en tu control si tu bebé está cabeza abajo y qué pasa si no lo está." },
  { id: "t-98", trimester: 3, text: "Conversá tu plan de parto con tu equipo: qué preferís y qué pasa si algo cambia." },
  { id: "t-99", trimester: 3, text: "Pensá quién te puede ayudar en casa en las primeras semanas después del parto." },
  { id: "t-100", trimester: 3, text: "Informate sobre la lactancia antes del parto: preguntá en tu control qué apoyo hay en tu hospital o sanatorio." },
  { id: "t-101", trimester: 3, text: "Si pasás la fecha probable, el equipo define el seguimiento: seguí yendo a los controles." },
  { id: "t-102", trimester: 3, text: "Averiguá si el lugar donde vas a tener a tu bebé permite acompañante y quién va a estar con vos." },
  { id: "t-103", trimester: 3, text: "Después del nacimiento hay trámites como la inscripción en el Registro Civil: en la app tenés qué se necesita." },
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
