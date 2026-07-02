// "Tus derechos y beneficios" — Paraguay-specific benefits navigator.
// Content verified against: Ley 5508/2015 (maternidad y lactancia, texto en
// bacn.gov.py), Ley 7383/2024 (permiso para controles prenatales), Ley
// 5099/2013 (gratuidad en servicios del MSPBS), Código del Trabajo
// (bonificación familiar) e IPS (subsidio por reposo de maternidad).
// Los montos y reglas pueden cambiar: la UI siempre muestra el aviso de
// verificación. Esto es información general, no asesoría legal.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Ley 5508: 18 semanas ininterrumpidas de licencia. */
export const MATERNITY_LEAVE_DAYS = 126;
/** Ley 5508: la licencia puede iniciarse hasta 2 semanas antes del parto. */
export const PRENATAL_START_DAYS = 14;
/** IPS emite el reposo por maternidad a partir de la semana 38 (FPP − 21 días). */
export const REPOSO_FROM_DUE_DAYS = 21;

export interface LeavePlan {
  /** Inicio más temprano de la licencia: FPP − 14 días (Ley 5508). */
  earliestStart: number;
  /** Fin si empieza en earliestStart: + 126 días corridos. */
  end: number;
  /** Desde cuándo IPS puede emitir el reposo: semana 38 (FPP − 21 días). */
  reposoAvailableFrom: number;
}

/** Compute the personal leave dates from the estimated due date. */
export function computeLeavePlan(dueDate: number): LeavePlan {
  const earliestStart = dueDate - PRENATAL_START_DAYS * MS_PER_DAY;
  return {
    earliestStart,
    end: earliestStart + MATERNITY_LEAVE_DAYS * MS_PER_DAY,
    reposoAvailableFrom: dueDate - REPOSO_FROM_DUE_DAYS * MS_PER_DAY,
  };
}

/** es-PY long date, e.g. "12 de setiembre de 2026". */
export function formatDateEsPy(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type WorkSituation = "ips" | "sin-ips" | "no-trabaja";

export const WORK_SITUATIONS: { key: WorkSituation; label: string; hint: string }[] = [
  {
    key: "ips",
    label: "Trabajo y aporto a IPS",
    hint: "En relación de dependencia, con seguro social",
  },
  {
    key: "sin-ips",
    label: "Trabajo sin IPS",
    hint: "Informal, por cuenta propia o sin aporte",
  },
  {
    key: "no-trabaja",
    label: "No trabajo",
    hint: "O estoy estudiando / en casa",
  },
];

export type BenefitPhase = "embarazo" | "parto" | "despues";

export const PHASE_LABELS: Record<BenefitPhase, string> = {
  embarazo: "Durante el embarazo",
  parto: "Para el parto",
  despues: "Después del nacimiento",
};

export interface BenefitItem {
  id: string;
  title: string;
  body: string;
  /** Qué hacer concretamente para ejercerlo. */
  action?: string;
  legalBasis?: string;
  phase: BenefitPhase;
  appliesTo: WorkSituation[];
}

export const BENEFITS: BenefitItem[] = [
  // ——— Durante el embarazo ———
  {
    id: "controles-gratuitos",
    title: "Controles prenatales gratuitos en Salud Pública",
    body: "Los controles del embarazo, los estudios y los medicamentos del listado básico son gratuitos en los servicios del Ministerio de Salud (hospitales, centros y puestos de salud), tengas o no trabajo o seguro. En tu primer control te entregan el carné perinatal: llevalo a todas las consultas.",
    action: "Acercate al servicio de salud más cercano con tu cédula y pedí tu primer control prenatal.",
    legalBasis: "Ley 5099/2013 (gratuidad en servicios del MSPBS)",
    phase: "embarazo",
    appliesTo: ["ips", "sin-ips", "no-trabaja"],
  },
  {
    id: "permiso-controles",
    title: "Permiso pagado para ir a tus controles",
    body: "Toda trabajadora embarazada, del sector público o privado, tiene derecho a un permiso de hasta 4 horas para consultas, controles o estudios prenatales, sin descuento de salario.",
    action: "Avisá con anticipación y entregá el comprobante del turno o la constancia de la consulta. Guardate una copia.",
    legalBasis: "Ley 7383/2024",
    phase: "embarazo",
    appliesTo: ["ips", "sin-ips"],
  },
  {
    id: "fuero-maternal",
    title: "Estabilidad laboral (fuero maternal)",
    body: "Desde que comunicás tu embarazo al empleador tenés estabilidad especial: no pueden despedirte sin causa justificada comprobada ante el juez, hasta un año después del nacimiento.",
    action: "Comunicá tu embarazo por escrito, con el certificado médico, y pedí constancia de recepción. Esa nota activa tu protección.",
    legalBasis: "Ley 5508/2015",
    phase: "embarazo",
    appliesTo: ["ips", "sin-ips"],
  },
  {
    id: "ips-obligatorio",
    title: "Tu empleador está obligado a asegurarte en IPS",
    body: "Si trabajás en relación de dependencia, tu empleador debe inscribirte en IPS aunque el trabajo sea de medio tiempo o \"sin contrato\". Sin IPS perdés el subsidio de maternidad y la atención del seguro, que son tuyos por derecho.",
    action: "Pedile a tu empleador que regularice tu inscripción. Si no lo hace, podés denunciarlo en el MTESS (Ministerio de Trabajo) o en IPS: la denuncia puede ser reservada.",
    legalBasis: "Código del Trabajo y Ley de Seguro Social (IPS)",
    phase: "embarazo",
    appliesTo: ["sin-ips"],
  },
  {
    id: "tekopora",
    title: "Tekoporã: apoyo económico si tu hogar lo necesita",
    body: "El programa Tekoporã da una transferencia de dinero a hogares en situación de pobreza, y las mujeres embarazadas cuentan para el beneficio. Pide como contrapartida lo que ya estás haciendo: controles pre y posparto, vacunas y cédula.",
    action: "Si tu hogar no fue censado, consultá en tu municipalidad o en la oficina departamental de desarrollo social cómo postular.",
    legalBasis: "Programa Tekoporã (Ministerio de Desarrollo Social)",
    phase: "embarazo",
    appliesTo: ["sin-ips", "no-trabaja"],
  },
  // ——— Para el parto ———
  {
    id: "licencia-maternidad",
    title: "Licencia de maternidad: 18 semanas",
    body: "Tenés derecho a 18 semanas ininterrumpidas de licencia (126 días), y podés empezarla hasta 2 semanas antes de la fecha probable de parto. Si el bebé nace antes de la semana 35, pesa menos de 2 kg o necesita cuidados especiales, la licencia se extiende a 24 semanas. En partos múltiples se suma 1 mes por cada hijo a partir del segundo.",
    action: "Presentá a tu empleador el certificado médico con la fecha probable de parto y quedate con una copia sellada.",
    legalBasis: "Ley 5508/2015",
    phase: "parto",
    appliesTo: ["ips", "sin-ips"],
  },
  {
    id: "subsidio-ips",
    title: "Subsidio de IPS: cobrás el 100% durante la licencia",
    body: "Durante la licencia, IPS te paga un subsidio equivalente al 100% de tu salario, en cuotas. Para tener derecho necesitás estar al día y contar con al menos 4 meses de aporte antes del reposo. El reposo se gestiona a partir de la semana 38 de gestación.",
    action: "Cerca de la semana 38, gestioná tu reposo en IPS (o en tu clínica de la red) y presentalo a tu empleador.",
    legalBasis: "Ley 5508/2015 y reglamentación de IPS",
    phase: "parto",
    appliesTo: ["ips"],
  },
  {
    id: "parto-gratuito",
    title: "Parto gratuito en la Salud Pública",
    body: "El parto, la cesárea si hace falta y la atención de tu bebé recién nacido son gratuitos en los hospitales del Ministerio de Salud, para todas. Llevá tu carné perinatal con todos los controles: es tu historia clínica.",
    action: "Identificá desde ya tu hospital o sanatorio de referencia y cómo llegar, también de noche.",
    legalBasis: "Ley 5099/2013 (gratuidad en servicios del MSPBS)",
    phase: "parto",
    appliesTo: ["ips", "sin-ips", "no-trabaja"],
  },
  {
    id: "paternidad",
    title: "Permiso de paternidad: 2 semanas para papá",
    body: "Si tu pareja trabaja en relación de dependencia, le corresponden 2 semanas de permiso pagado después del nacimiento. Es un derecho irrenunciable, a cargo del empleador.",
    action: "Que presente el certificado de nacimiento a su empleador apenas nazca el bebé.",
    legalBasis: "Ley 5508/2015",
    phase: "parto",
    appliesTo: ["ips", "sin-ips", "no-trabaja"],
  },
  // ——— Después del nacimiento ———
  {
    id: "lactancia",
    title: "Permisos de lactancia al volver al trabajo",
    body: "Cuando te reincorpores, tenés derecho a 90 minutos por día para amamantar o extraerte leche hasta que tu bebé cumpla 7 meses, y 60 minutos por día desde los 7 hasta los 24 meses. Las instituciones y empresas con más de 10 trabajadoras deben tener una sala de lactancia.",
    action: "Presentá el certificado del pediatra y acordá por escrito el horario del permiso.",
    legalBasis: "Ley 5508/2015",
    phase: "despues",
    appliesTo: ["ips", "sin-ips"],
  },
  {
    id: "bonificacion-familiar",
    title: "Bonificación familiar: 5% del mínimo por cada hijo",
    body: "Si trabajás en relación de dependencia y ganás hasta 2 salarios mínimos, tu empleador debe pagarte cada mes una bonificación del 5% del salario mínimo por cada hijo menor de 17 años (sin límite de edad si tiene discapacidad). Se cobra junto con el salario.",
    action: "Entregá a RR. HH. el acta o certificado de nacimiento y pedí que la bonificación aparezca en tu recibo.",
    legalBasis: "Código del Trabajo, arts. 261 y siguientes",
    phase: "despues",
    appliesTo: ["ips", "sin-ips"],
  },
  {
    id: "atencion-bebe",
    title: "Atención y vacunas gratuitas para tu bebé",
    body: "Los controles del recién nacido y todas las vacunas del esquema PAI son gratuitos en la Salud Pública. Si aportás a IPS, tu bebé también puede atenderse por tu seguro: inscribilo como beneficiario.",
    action: "Agendá el primer control del bebé antes del alta y llevá siempre su libreta de vacunación.",
    legalBasis: "Ley 5099/2013 y esquema PAI (MSPBS)",
    phase: "despues",
    appliesTo: ["ips", "sin-ips", "no-trabaja"],
  },
];

/** Benefits that apply to a given work situation, in seed order. */
export function benefitsFor(situation: WorkSituation): BenefitItem[] {
  return BENEFITS.filter((b) => b.appliesTo.includes(situation));
}

/** Benefits grouped by phase, preserving seed order inside each phase. */
export function benefitsByPhase(
  situation: WorkSituation,
): { phase: BenefitPhase; items: BenefitItem[] }[] {
  const phases: BenefitPhase[] = ["embarazo", "parto", "despues"];
  return phases
    .map((phase) => ({
      phase,
      items: benefitsFor(situation).filter((b) => b.phase === phase),
    }))
    .filter((g) => g.items.length > 0);
}
