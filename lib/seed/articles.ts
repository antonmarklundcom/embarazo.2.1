import type { Article } from "../types";

// 8 genuinely Paraguay-specific guías in es-PY voseo (build spec §5).
// reviewedBy is informational seed metadata; the visible byline on the page
// uses NEXT_PUBLIC_MEDICAL_REVIEWER via <MedicalReviewByline>.
const REVIEWER = "Equipo médico de Nido";

export const ARTICLES: Article[] = [
  {
    slug: "dengue-zika-chikungunya-embarazo",
    title: "Dengue, zika y chikungunya en el embarazo",
    excerpt:
      "Cómo cuidarte del mosquito Aedes aegypti y qué hacer si tenés fiebre durante el embarazo.",
    date: "2026-01-15",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "salud",
    html: `
<p>En Paraguay el dengue, el zika y el chikungunya circulan sobre todo en los meses de calor y lluvia. Los tres los transmite el mismo mosquito, el <em>Aedes aegypti</em>, que se cría en agua limpia y estancada. Durante el embarazo conviene cuidarse con más razón.</p>
<h2>Por qué importa en el embarazo</h2>
<p>El dengue puede ser más complicado en mujeres embarazadas. El zika, además, puede afectar el desarrollo del bebé, sobre todo en los primeros meses. Por eso la prevención del mosquito no es un detalle: es parte de tu control del embarazo.</p>
<h2>Cómo evitar las picaduras</h2>
<ul>
<li>Usá repelente apto para embarazadas (con DEET o icaridina) sobre la piel descubierta, varias veces al día.</li>
<li>Poné mosquitero en la cama, sobre todo para la siesta.</li>
<li>Usá ropa de manga larga y clara en las horas de más mosquito, al amanecer y al atardecer.</li>
<li>Colocá tela mosquitera en ventanas si podés.</li>
</ul>
<h2>Eliminá los criaderos en tu casa</h2>
<p>El mosquito se cría en cualquier recipiente con agua quieta. Una vez por semana:</p>
<ul>
<li>Dá vuelta baldes, botellas y cubiertas viejas.</li>
<li>Lavá y cepillá los bebederos de animales y los floreros.</li>
<li>Tapá los tanques y aljibes.</li>
<li>Cuidá los portamacetas y canaletas donde se junta agua de lluvia.</li>
</ul>
<h2>Si tenés fiebre</h2>
<p>Ante fiebre, dolor de cuerpo, dolor detrás de los ojos o manchas en la piel, <strong>contactá a tu sanatorio</strong>. No tomes aspirina ni ibuprofeno por tu cuenta: en el dengue pueden ser peligrosos. El paracetamol suele ser la opción más segura, pero confirmá la dosis con tu médico. Tomá mucho líquido y descansá.</p>
<p>Esta guía es informativa y no reemplaza la consulta con un profesional.</p>
`,
  },
  {
    slug: "terere-mate-cocido-cafeina-embarazo",
    title: "Tereré, mate cocido y cafeína en el embarazo",
    excerpt:
      "Podés seguir disfrutando del tereré, con algunos cuidados. Cuánta cafeína es razonable y cómo hidratarte con el calor.",
    date: "2026-01-20",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "alimentacion",
    html: `
<p>El tereré y el mate cocido son parte de nuestro día a día. La buena noticia es que no tenés que dejarlos en el embarazo: solo conviene tener en cuenta un par de cosas.</p>
<h2>La cafeína, con moderación</h2>
<p>La yerba mate tiene cafeína (a veces llamada mateína). Durante el embarazo se recomienda no pasar de unos <strong>200 mg de cafeína por día</strong>, sumando todo: tereré, mate cocido, café y gaseosas tipo cola.</p>
<p>Para que te hagas una idea, ese límite equivale más o menos a dos tazas de café. El tereré y el mate cocido aportan bastante menos por porción, así que un tereré a la tarde entra sin problema. El tema es no encimar tereré, varios cafés y gaseosa en el mismo día.</p>
<h2>Hidratación con el calor</h2>
<p>Acá hace mucho calor y el embarazo te pide todavía más líquido. El tereré ayuda a hidratarte, sobre todo si lo tomás con agua bien fría y le agregás hierbas frescas. Igual, que no sea tu único líquido del día: tomá también agua sola.</p>
<h2>Cuidados con las hierbas (yuyos)</h2>
<p>Muchas hierbas que se usan en el tereré son inofensivas, pero algunas no se recomiendan en el embarazo porque pueden estimular el útero. Ante la duda con un yuyo, preguntá en tu control antes de usarlo de forma habitual.</p>
<h2>La bombilla y la higiene</h2>
<p>Compartir el tereré es lindo, pero la bombilla pasa saliva de una persona a otra. Si alguien del grupo está resfriado o con angina, mejor no compartir esa ronda.</p>
<p>Esta guía es informativa y no reemplaza la consulta con un profesional.</p>
`,
  },
  {
    slug: "que-llevar-al-sanatorio",
    title: "Qué llevar al sanatorio: el bolso para vos y para el bebé",
    excerpt:
      "Una lista clara de lo que conviene tener listo desde la semana 32, para vos y para tu bebé.",
    date: "2026-01-25",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "logistica",
    html: `
<p>Tener el bolso listo desde la semana 32 te saca un peso de encima. Así, cuando llegue el momento, salís tranquila. Te dejamos una lista para armarlo.</p>
<h2>Documentos (lo primero)</h2>
<ul>
<li>Tu cédula de identidad.</li>
<li>El carné perinatal con todos tus controles.</li>
<li>Carné del seguro o de IPS, si tenés.</li>
<li>Estudios y ecografías recientes.</li>
</ul>
<h2>Para vos</h2>
<ul>
<li>Dos o tres camisones abiertos adelante (ayudan para la lactancia).</li>
<li>Bombachas cómodas y corpiños de lactancia.</li>
<li>Toallas higiénicas grandes para después del parto.</li>
<li>Chinelas, medias y una campera liviana.</li>
<li>Artículos de higiene: cepillo, pasta, jabón, toalla, peine.</li>
<li>Cargador de celular con cable largo.</li>
<li>Agua y algún alimento liviano para acompañante.</li>
</ul>
<h2>Para el bebé</h2>
<ul>
<li>Bodies y enteritos según el clima (uno por día de internación, más alguno de repuesto).</li>
<li>Gorrito, medias y una mantita.</li>
<li>Pañales para recién nacido y toallitas húmedas.</li>
<li>La ropa para volver a casa.</li>
</ul>
<h2>Un consejo</h2>
<p>Dejá el bolso cerca de la puerta y avisá a quien te acompañe dónde está. Guardá en el celular el contacto del sanatorio y tené pensado cómo vas a llegar, con un plan B por las dudas.</p>
`,
  },
  {
    slug: "despues-del-nacimiento-tramites",
    title: "Después del nacimiento: certificado, Registro Civil y cédula del bebé",
    excerpt:
      "Los trámites para que tu bebé tenga sus documentos: del certificado de nacido vivo a la cédula.",
    date: "2026-02-01",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "tramites",
    html: `
<p>Cuando nace tu bebé hay una serie de trámites para que tenga sus documentos en regla. Te los ordenamos paso a paso.</p>
<h2>1. Certificado de nacido vivo</h2>
<p>Lo emite el sanatorio o el hospital donde nació el bebé. Es el papel que prueba el nacimiento y lo necesitás para inscribirlo. Guardalo bien: sin este documento no podés seguir con el resto.</p>
<h2>2. Inscripción en el Registro Civil</h2>
<p>Con el certificado de nacido vivo vas al Registro Civil a inscribir el nacimiento. Ahí se anota oficialmente el nombre y apellido de tu bebé y te dan el certificado de nacimiento. Conviene hacerlo en las primeras semanas.</p>
<p>Llevá tu cédula y la del papá si va a figurar. Si los padres están casados o si el papá reconoce al bebé, suele requerirse su presencia o su documentación.</p>
<h2>3. Cédula de identidad del bebé</h2>
<p>Con el certificado de nacimiento ya podés tramitar la primera cédula de tu bebé en Identificaciones. Tener la cédula le sirve, entre otras cosas, para la atención en salud y para anotarlo como beneficiario en IPS si corresponde.</p>
<h2>Un consejo</h2>
<p>Los requisitos y horarios pueden cambiar según la oficina y la ciudad. Antes de salir, llamá o consultá para confirmar qué papeles llevar y evitar un viaje en vano. Tené todo en una carpeta para no perder ningún documento.</p>
<p>Esta guía es informativa; confirmá los requisitos vigentes en las oficinas correspondientes.</p>
`,
  },
  {
    slug: "control-prenatal-ips-vs-privado",
    title: "Control prenatal en Paraguay: IPS, sanatorio privado y carné perinatal",
    excerpt:
      "Cómo es el control del embarazo en IPS y en el sector privado, y por qué tu carné perinatal es tan importante.",
    date: "2026-02-05",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "salud",
    html: `
<p>El control prenatal es el seguimiento de tu embarazo: consultas, estudios y ecografías para cuidar tu salud y la del bebé. En Paraguay podés hacerlo en distintos lugares.</p>
<h2>IPS, salud pública y sector privado</h2>
<ul>
<li><strong>IPS:</strong> si vos o tu pareja aportan, podés atenderte en IPS. Cubre controles, estudios y el parto.</li>
<li><strong>Salud pública (Ministerio de Salud):</strong> los centros y hospitales públicos ofrecen control prenatal gratuito. Es un derecho, tengas o no seguro.</li>
<li><strong>Sanatorio privado:</strong> con un seguro privado o pagando, elegís el sanatorio y el profesional. Suele tener más comodidad y elección de horarios.</li>
</ul>
<p>No importa la opción: lo clave es empezar temprano y no faltar a los controles.</p>
<h2>El carné perinatal</h2>
<p>Es la libretita donde se anota todo tu embarazo: peso, presión, altura de la panza, resultados de estudios y fechas. <strong>Llevalo siempre a cada control y al sanatorio el día del parto.</strong> Si te atendés en distintos lugares, el carné permite que cualquier profesional sepa cómo viene tu embarazo.</p>
<h2>Qué estudios y cuándo, a grandes rasgos</h2>
<ul>
<li><strong>Primer trimestre:</strong> análisis de sangre y orina, grupo sanguíneo, y la primera ecografía.</li>
<li><strong>Segundo trimestre:</strong> ecografía morfológica (semanas 18 a 22) y control de azúcar para descartar diabetes gestacional.</li>
<li><strong>Tercer trimestre:</strong> controles más seguidos, ecografía de crecimiento y preparación para el parto.</li>
</ul>
<p>Cada embarazo es distinto; tu equipo de salud ajusta el plan a tu caso. Esta guía es informativa y no reemplaza la consulta profesional.</p>
`,
  },
  {
    slug: "senales-de-alarma-embarazo",
    title: "Señales de alarma en el embarazo: cuándo contactar a tu sanatorio",
    excerpt:
      "Síntomas que no conviene dejar pasar. Ante cualquiera de ellos, contactá a tu sanatorio.",
    date: "2026-02-10",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "salud",
    html: `
<p>La mayoría de los embarazos transcurre sin sobresaltos, pero hay señales que conviene conocer para actuar a tiempo. Esta guía es informativa y <strong>no sirve para diagnosticar</strong>: ante cualquiera de estos síntomas, contactá a tu sanatorio o acercate a una guardia.</p>
<h2>Contactá a tu sanatorio si tenés:</h2>
<ul>
<li><strong>Sangrado vaginal</strong>, en cualquier momento del embarazo.</li>
<li><strong>Pérdida de líquido</strong> por la vagina (puede ser que se haya roto la bolsa).</li>
<li><strong>Dolor de cabeza fuerte y que no pasa</strong>, visión borrosa o lucecitas, sobre todo en el último trimestre.</li>
<li><strong>Hinchazón brusca</strong> de cara, manos o pies.</li>
<li><strong>Dolor fuerte en la panza</strong> o contracciones regulares antes de tiempo.</li>
<li><strong>Fiebre</strong> de 38 °C o más.</li>
<li><strong>Menos movimiento del bebé</strong> de lo habitual a partir del tercer trimestre.</li>
<li><strong>Vómitos que no paran</strong> y no te dejan retener líquidos.</li>
<li>Ardor o dolor fuerte al orinar.</li>
</ul>
<h2>Sobre los movimientos del bebé</h2>
<p>Cada bebé tiene su ritmo. Si notás que se mueve menos de lo habitual, recostate de costado, tomá algo fresco y prestá atención un rato. Si seguís sin sentirlo bien, contactá a tu sanatorio. Vale más una consulta de más que quedarte con la duda.</p>
<p>Confiá en lo que sentís. Si algo no te cierra, consultá: para eso está tu equipo de salud.</p>
`,
  },
  {
    slug: "vacunas-en-el-embarazo-pai",
    title: "Vacunas en el embarazo (esquema PAI Paraguay)",
    excerpt:
      "Qué vacunas se recomiendan durante el embarazo para protegerte a vos y a tu bebé.",
    date: "2026-02-15",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "salud",
    html: `
<p>Algunas vacunas durante el embarazo te protegen a vos y le pasan defensas al bebé para sus primeros meses de vida. En Paraguay forman parte del Programa Ampliado de Inmunizaciones (PAI) y son gratuitas en los vacunatorios públicos.</p>
<h2>Vacunas que suelen recomendarse en el embarazo</h2>
<ul>
<li><strong>Antitetánica (con componente para difteria y tos convulsa):</strong> protege al bebé de la tos convulsa (coqueluche) en sus primeros meses, cuando todavía no puede vacunarse él mismo.</li>
<li><strong>Antigripal (influenza):</strong> recomendada en cualquier momento del embarazo, sobre todo en temporada de gripe. La embarazada tiene más riesgo de complicarse con la gripe.</li>
<li><strong>COVID-19:</strong> según las indicaciones vigentes del Ministerio de Salud.</li>
</ul>
<h2>Cómo y cuándo</h2>
<p>El momento exacto de cada dosis te lo indica tu control prenatal según tu historia de vacunas. Llevá tu carné de vacunas si lo tenés, para que vean qué te falta.</p>
<h2>Lo que conviene saber</h2>
<ul>
<li>Las vacunas del embarazo que se recomiendan en el PAI son seguras para vos y el bebé.</li>
<li>Algunas vacunas con virus vivos (como sarampión o rubéola) no se dan durante el embarazo: esas van antes o después.</li>
<li>Anotá en el carné perinatal cada vacuna que te das.</li>
</ul>
<p>Esta guía es informativa. Confirmá tu esquema con tu equipo de salud o en el vacunatorio, donde tienen el calendario PAI actualizado.</p>
`,
  },
  {
    slug: "derechos-embarazada-que-trabaja",
    title: "Derechos de la embarazada que trabaja en Paraguay",
    excerpt:
      "Permiso de maternidad, descanso de lactancia y protección contra el despido: lo básico que conviene conocer.",
    date: "2026-02-20",
    author: "Nido",
    reviewedBy: REVIEWER,
    cluster: "derechos",
    html: `
<p>Si trabajás en relación de dependencia, la ley te protege durante el embarazo y después del parto. Conocer tus derechos te ayuda a hacerlos valer.</p>
<h2>Permiso de maternidad</h2>
<p>Tenés derecho a un período de licencia por maternidad alrededor del parto, con resguardo de tu puesto. Avisá a tu empleador con el certificado médico y dejá constancia por escrito.</p>
<h2>Descanso de lactancia</h2>
<p>Al volver al trabajo, te corresponden pausas durante la jornada para amamantar o extraer leche. Es un derecho pensado para que puedas seguir con la lactancia sin perder tu trabajo.</p>
<h2>Protección contra el despido</h2>
<p>Durante el embarazo y un tiempo después del parto, existe una protección especial frente al despido por causa del embarazo o la maternidad. Si te despiden en ese período, conviene asesorarte.</p>
<h2>Atención en salud</h2>
<p>Si aportás a IPS, tenés cobertura para los controles, el parto y la atención del bebé. Faltar al trabajo para tus controles prenatales con el justificativo médico correspondiente es parte de tu derecho a cuidarte.</p>
<h2>Un consejo práctico</h2>
<ul>
<li>Guardá copias de tus certificados médicos y de las notas que entregás.</li>
<li>Pedí siempre constancia de recepción cuando presentás un papel.</li>
<li>Ante una duda o un conflicto, buscá asesoría laboral; en muchos casos es gratuita.</li>
</ul>
<p>Esta guía es informativa y general. Las situaciones particulares conviene consultarlas con un profesional del derecho laboral.</p>
`,
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
