import type { WeekInfo } from "./types";
import { getTrimester } from "./pregnancy";

// Weeks 1–42 with real, Paraguay-specific content in es-PY voseo (build spec §5).
// Size comparisons use everyday Paraguayan items and progress realistically.
// Lengths/weights are approximate gestational averages (crown-rump up to ~week 20,
// then crown-heel), shown only once the embryo/fetus is measurable.
//
// trimester is derived from the week so it can never drift out of sync.
type RawWeek = Omit<WeekInfo, "trimester">;

const RAW_WEEKS: RawWeek[] = [
  {
    week: 1,
    sizeComparison: "todavía no hay embrión",
    milestone:
      "Tu cuerpo se prepara. Las semanas se cuentan desde tu última menstruación, así que en la semana 1 todavía no hubo concepción.",
    tip: "Si estás buscando embarazo, empezá con ácido fólico y reducí el cigarrillo y el alcohol desde ahora.",
  },
  {
    week: 2,
    sizeComparison: "todavía no hay embrión",
    milestone:
      "Es la semana de la ovulación para muchas. El cuerpo libera un óvulo que puede ser fecundado en estos días.",
    tip: "Tomá el tereré y el agua que necesites: una buena hidratación acompaña todo el proceso, sobre todo con el calor.",
  },
  {
    week: 3,
    sizeComparison: "una semilla de chía",
    lengthCm: 0.01,
    milestone:
      "Si hubo fecundación, el óvulo se transforma en un grupito de células que viaja hacia el útero. Todo es microscópico todavía.",
    tip: "Seguí con el ácido fólico todos los días. Ayuda a formar bien el sistema nervioso del bebé.",
  },
  {
    week: 4,
    sizeComparison: "una semilla de amapola",
    lengthCm: 0.1,
    milestone:
      "El embrión se implanta en el útero. Es cuando muchas notan el atraso y un test puede dar positivo.",
    tip: "Si el test da positivo, pedí turno para tu primer control y sacá tu carné perinatal cuanto antes.",
  },
  {
    week: 5,
    sizeComparison: "un grano de sésamo",
    lengthCm: 0.2,
    weightG: 1,
    milestone:
      "Empieza a formarse el tubo neural, que será el cerebro y la médula. El corazón ya está dando sus primeros latidos.",
    tip: "Pueden aparecer náuseas y mucho sueño. Comé de a poco y seguido; las galletitas saladas suelen ayudar a la mañana.",
  },
  {
    week: 6,
    sizeComparison: "una lenteja",
    lengthCm: 0.4,
    weightG: 1,
    milestone:
      "El corazón late más fuerte y se forman los brotes de los brazos y las piernas. La carita empieza a definirse.",
    tip: "Con el calor de Paraguay las náuseas se sienten más. Tené siempre agua fresca cerca y evitá ambientes muy calurosos.",
  },
  {
    week: 7,
    sizeComparison: "un grano de maíz",
    lengthCm: 1,
    weightG: 1,
    milestone:
      "El cerebro crece rápido y se forman manos y pies en pequeños brotes. El embrión se mueve, aunque todavía no lo sentís.",
    tip: "Si las náuseas no te dejan comer ni tomar líquido, contactá a tu sanatorio: hay formas de ayudarte.",
  },
  {
    week: 8,
    sizeComparison: "un poroto",
    lengthCm: 1.6,
    weightG: 1,
    milestone:
      "Ya tiene parpados, labio superior y la punta de la nariz. Los dedos empiezan a separarse.",
    tip: "Es buen momento para tu primera ecografía. Preguntá en tu control prenatal cuándo te toca.",
  },
  {
    week: 9,
    sizeComparison: "una aceituna",
    lengthCm: 2.3,
    weightG: 2,
    milestone:
      "Termina la etapa de embrión: ahora se llama feto. Tiene todos los órganos principales esbozados.",
    tip: "El cansancio es normal en estas semanas. Dormí la siesta si podés; tu cuerpo está trabajando mucho.",
  },
  {
    week: 10,
    sizeComparison: "una guinda",
    lengthCm: 3.1,
    weightG: 4,
    milestone:
      "Se forman las uñas y empieza a funcionar el sistema digestivo. Los huesos comienzan a endurecerse.",
    tip: "Cuidá tu alimentación con proteínas y frutas locales. La mandarina y la naranja aportan vitamina C y se consiguen fácil.",
  },
  {
    week: 11,
    sizeComparison: "una frutilla",
    lengthCm: 4.1,
    weightG: 7,
    milestone:
      "El bebé ya abre y cierra las manitos y mueve la cabeza. La placenta crece para nutrirlo mejor.",
    tip: "Entre las semanas 11 y 14 suele hacerse una ecografía importante. No te la saltees.",
  },
  {
    week: 12,
    sizeComparison: "una lima",
    lengthCm: 5.4,
    weightG: 14,
    milestone:
      "Casi todos los órganos están formados. Los reflejos aparecen y el bebé puede mover los dedos.",
    tip: "Estás por terminar el primer trimestre. Para muchas, las náuseas empiezan a aflojar a partir de ahora.",
  },
  {
    week: 13,
    sizeComparison: "un durazno",
    lengthCm: 7.4,
    weightG: 23,
    milestone:
      "Última semana del primer trimestre. Ya tiene huellas digitales y las cuerdas vocales se están formando.",
    tip: "Anotá tus dudas para el próximo control. Llevar las preguntas escritas ayuda a no olvidarte nada.",
  },
  {
    week: 14,
    sizeComparison: "un limón",
    lengthCm: 8.7,
    weightG: 43,
    milestone:
      "Arranca el segundo trimestre, el más llevadero para muchas. El bebé hace muecas y puede chuparse el dedo.",
    tip: "Si te sentís con más energía, aprovechá para caminar un poco cada día. Hacelo en las horas más frescas.",
  },
  {
    week: 15,
    sizeComparison: "una mandarina",
    lengthCm: 10.1,
    weightG: 70,
    milestone:
      "El bebé percibe la luz aunque tenga los ojos cerrados y empieza a oír sonidos de tu cuerpo.",
    tip: "Hablale o ponele música: aunque parezca pronto, tu voz ya forma parte de su mundo.",
  },
  {
    week: 16,
    sizeComparison: "una palta pequeña",
    lengthCm: 11.6,
    weightG: 100,
    milestone:
      "Los músculos de la cara ya funcionan y el cuello se sostiene mejor. Algunas mamás empiezan a intuir movimientos.",
    tip: "Si es tu segundo embarazo, capaz sentís las primeras pataditas estas semanas. En el primero suele tardar un poco más.",
  },
  {
    week: 17,
    sizeComparison: "una granada",
    lengthCm: 13,
    weightG: 140,
    milestone:
      "Se forma la grasa que le dará calor al nacer. El esqueleto, antes blando, se va volviendo hueso.",
    tip: "Tu panza empieza a notarse. Usá ropa cómoda y fresca, ideal para el clima de acá.",
  },
  {
    week: 18,
    sizeComparison: "un mamón pequeño",
    lengthCm: 14.2,
    weightG: 190,
    milestone:
      "El bebé se mueve bastante: estira, patea y se da vuelta. Sus oídos ya están en su lugar y oye mejor.",
    tip: "Entre las semanas 18 y 22 va la ecografía del segundo trimestre, donde suele verse el sexo si querés saber.",
  },
  {
    week: 19,
    sizeComparison: "un mango",
    lengthCm: 15.3,
    weightG: 240,
    milestone:
      "Una capa protectora cubre su piel. Si es nena, ya tiene formados sus óvulos; si es varón, sus genitales se definen.",
    tip: "Pueden aparecer calambres o dolor en la cintura. Dormí de costado, mejor del lado izquierdo, con una almohada entre las piernas.",
  },
  {
    week: 20,
    sizeComparison: "una banana",
    lengthCm: 25.6,
    weightG: 300,
    milestone:
      "Llegaste a la mitad del camino. El bebé traga líquido y sus riñones ya producen pis.",
    tip: "Es momento de empezar a pensar dónde querés tener al bebé. Mirá el directorio de Nido por departamento.",
  },
  {
    week: 21,
    sizeComparison: "una mazorca de choclo",
    lengthCm: 26.7,
    weightG: 360,
    milestone:
      "Los movimientos se vuelven más fuertes y seguidos. Tiene momentos de actividad y de descanso.",
    tip: "Empezá a registrar cuándo se mueve más. Conocer su ritmo te va a ayudar a notar cambios más adelante.",
  },
  {
    week: 22,
    sizeComparison: "un mamón mediano",
    lengthCm: 27.8,
    weightG: 430,
    milestone:
      "Sus rasgos ya son los que tendrá al nacer: cejas, labios y los primeros pelitos.",
    tip: "Cuidá tu piel del sol y mantenete hidratada. Con el calor, el tereré y el agua son tus mejores aliados.",
  },
  {
    week: 23,
    sizeComparison: "un pomelo",
    lengthCm: 28.9,
    weightG: 501,
    milestone:
      "Empieza a escuchar tu voz, tu corazón y los ruidos de afuera. La audición se afina cada semana.",
    tip: "En estas semanas se controla la diabetes gestacional. Si te piden el estudio de la curva de azúcar, no lo dejes pasar.",
  },
  {
    week: 24,
    sizeComparison: "una mandioca",
    lengthCm: 30,
    weightG: 600,
    milestone:
      "Los pulmones desarrollan las ramitas por donde después entrará el aire. La carita está casi completa.",
    tip: "Conocé las señales de alarma del embarazo. Ante sangrado, dolor fuerte o pérdida de líquido, contactá a tu sanatorio enseguida.",
  },
  {
    week: 25,
    sizeComparison: "un coco",
    lengthCm: 34.6,
    weightG: 660,
    milestone:
      "Va ganando grasa y la piel se pone menos arrugada. Reacciona a tu voz con movimientos.",
    tip: "Pueden hincharse los pies, sobre todo con el calor. Subí las piernas un rato al final del día.",
  },
  {
    week: 26,
    sizeComparison: "un repollo pequeño",
    lengthCm: 35.6,
    weightG: 760,
    milestone:
      "Abre los ojos por primera vez y responde a la luz fuerte sobre la panza. Los pulmones siguen madurando.",
    tip: "Estás por entrar al tercer trimestre. Empezá a armar tu lista para el bolso del sanatorio sin apuro.",
  },
  {
    week: 27,
    sizeComparison: "una coliflor",
    lengthCm: 36.6,
    weightG: 875,
    milestone:
      "Última semana del segundo trimestre. El bebé tiene hipo a veces; vas a sentir pequeños saltitos rítmicos.",
    tip: "Conversá en tu control sobre tu plan de parto y las dudas que tengas para el final del embarazo.",
  },
  {
    week: 28,
    sizeComparison: "una berenjena grande",
    lengthCm: 37.6,
    weightG: 1005,
    milestone:
      "Arranca el tercer trimestre. El bebé sueña, parpadea y su cerebro forma surcos cada vez más complejos.",
    tip: "A partir de ahora los controles suelen ser más seguidos. Anotá las fechas para no perderte ninguno.",
  },
  {
    week: 29,
    sizeComparison: "un coco grande",
    lengthCm: 38.6,
    weightG: 1153,
    milestone:
      "Los músculos y los pulmones siguen madurando. Sus pataditas son cada vez más firmes.",
    tip: "Si notás menos movimiento de lo habitual, recostate de costado, tomá algo fresco y contá las pataditas. Si siguen pocas, contactá a tu sanatorio.",
  },
  {
    week: 30,
    sizeComparison: "un repollo",
    lengthCm: 39.9,
    weightG: 1319,
    milestone:
      "La médula ósea ya fabrica glóbulos rojos. El bebé regula mejor su propia temperatura.",
    tip: "Si trabajás, informate sobre tus derechos: permiso de maternidad, controles y descansos. Mirá la guía de Nido al respecto.",
  },
  {
    week: 31,
    sizeComparison: "un coco con su cáscara",
    lengthCm: 41.1,
    weightG: 1502,
    milestone:
      "Puede mover la cabeza de lado a lado y patalear con fuerza. Ocupa cada vez más espacio.",
    tip: "Las contracciones de práctica (Braxton Hicks) pueden aparecer. Son irregulares y no duelen como las de parto; descansá y tomá agua.",
  },
  {
    week: 32,
    sizeComparison: "una lechuga",
    lengthCm: 42.4,
    weightG: 1702,
    milestone:
      "Practica respirar moviendo el diafragma y ya tiene uñas en los deditos. Muchos bebés se acomodan cabeza abajo.",
    tip: "Dejá listo el bolso del sanatorio para vos y para el bebé. Tené a mano tu documento y tu carné perinatal.",
  },
  {
    week: 33,
    sizeComparison: "un ananá",
    lengthCm: 43.7,
    weightG: 1918,
    milestone:
      "Los huesos del cráneo todavía están blandos y separados para poder pasar por el parto. El sistema inmune se fortalece.",
    tip: "Repasá las señales de trabajo de parto para saber cuándo ir al sanatorio. Tené el contacto guardado en el teléfono.",
  },
  {
    week: 34,
    sizeComparison: "un melón pequeño",
    lengthCm: 45,
    weightG: 2146,
    milestone:
      "Los pulmones están casi listos. Si naciera ahora, tendría muy buenas chances con apoyo médico.",
    tip: "Andá teniendo lista la documentación para inscribir al bebé después del nacimiento. Mirá la guía sobre el Registro Civil.",
  },
  {
    week: 35,
    sizeComparison: "un melón",
    lengthCm: 46.2,
    weightG: 2383,
    milestone:
      "Engorda rápido y la panza ya casi no le deja espacio para grandes giros. Sus riñones están completos.",
    tip: "Si sentís mucha presión abajo o ganas frecuentes de hacer pis, es normal: el bebé baja hacia la pelvis.",
  },
  {
    week: 36,
    sizeComparison: "una lechuga grande",
    lengthCm: 47.4,
    weightG: 2622,
    milestone:
      "Se considera casi a término. La mayoría ya está cabeza abajo, lista para nacer.",
    tip: "Confirmá con tu sanatorio el camino y el contacto para el día del parto. Tené un plan B de cómo llegar.",
  },
  {
    week: 37,
    sizeComparison: "una sandía pequeña",
    lengthCm: 48.6,
    weightG: 2859,
    milestone:
      "A partir de ahora se considera a término temprano. El bebé practica respirar y agarrar con la mano.",
    tip: "Conocé las señales de parto: contracciones regulares y cada vez más seguidas, pérdida del tapón mucoso o de líquido.",
  },
  {
    week: 38,
    sizeComparison: "un zapallo pequeño",
    lengthCm: 49.8,
    weightG: 3083,
    milestone:
      "Casi todo está listo. Sigue acumulando grasa que le dará calor y energía después de nacer.",
    tip: "Descansá y mantené la calma. Tené el bolso en la puerta y los contactos importantes a mano.",
  },
  {
    week: 39,
    sizeComparison: "una sandía mediana",
    lengthCm: 50.7,
    weightG: 3288,
    milestone:
      "Bebé a término completo. Los pulmones y el cerebro siguen afinándose hasta el último día.",
    tip: "Ante contracciones regulares, pérdida de líquido o sangrado, contactá a tu sanatorio. Confiá en lo que sentís.",
  },
  {
    week: 40,
    sizeComparison: "una sandía",
    lengthCm: 51.2,
    weightG: 3462,
    milestone:
      "Llegó tu fecha probable de parto. Recordá que es una estimación: muchos bebés nacen unos días antes o después.",
    tip: "Si pasás la fecha sin señales de parto, tu sanatorio va a controlarte más seguido. Es algo común y esperable.",
  },
  {
    week: 41,
    sizeComparison: "una sandía grande",
    lengthCm: 51.7,
    weightG: 3597,
    milestone:
      "El bebé sigue creciendo un poquito. El equipo de salud vigila de cerca que todo siga bien.",
    tip: "Mantené el control prenatal al día. Pueden proponerte adelantar el parto si conviene; preguntá todas tus dudas.",
  },
  {
    week: 42,
    sizeComparison: "una sandía grande y madura",
    lengthCm: 51.7,
    weightG: 3685,
    milestone:
      "Pocos embarazos llegan hasta acá. El nacimiento está muy cerca y el seguimiento médico es más estricto.",
    tip: "Seguí al pie las indicaciones de tu sanatorio. Pronto vas a tener a tu bebé en brazos.",
  },
];

export const WEEKS: WeekInfo[] = RAW_WEEKS.map((w) => ({
  ...w,
  trimester: getTrimester(w.week),
}));

export function getWeek(week: number): WeekInfo {
  const clamped = Math.min(42, Math.max(1, Math.floor(week)));
  // WEEKS is 1-indexed by content; find is safe and clear.
  return WEEKS.find((w) => w.week === clamped) ?? WEEKS[0]!;
}
