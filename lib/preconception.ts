// Evidence-based preconception checklist (build spec §3), es-PY voseo.
// Calm and informational — never fear-based. Each item carries a short source
// note. State is stored locally in `checklistState` under these `key`s.

export interface PreconceptionItem {
  key: string;
  label: string;
  detail: string;
  /** Short, human-readable source (shown in the UI). */
  source: string;
}

export const PRECONCEPTION_ITEMS: PreconceptionItem[] = [
  {
    key: "preconcep-acido-folico",
    label: "Empezar ácido fólico antes de concebir",
    detail:
      "Tomá 400 µg (0,4 mg) de ácido fólico por día, idealmente desde 1 a 3 meses antes de buscar embarazo. Ayuda a prevenir defectos del tubo neural.",
    source: "OMS · MSPyBS",
  },
  {
    key: "preconcep-consulta",
    label: "Consulta preconcepcional",
    detail:
      "Pedí una consulta con tu médico/a u obstetra antes de buscar embarazo para revisar tu salud, antecedentes y medicación.",
    source: "OMS",
  },
  {
    key: "preconcep-vacunas",
    label: "Vacunas al día",
    detail:
      "Verificá que tengas al día vacunas como rubéola (SPR), hepatitis B y tétanos. Algunas conviene aplicarlas antes del embarazo.",
    source: "PAI · MSPyBS",
  },
  {
    key: "preconcep-peso",
    label: "Peso saludable",
    detail:
      "Llegar al embarazo con un peso saludable, buena alimentación y actividad física acompaña un embarazo más sano.",
    source: "OMS",
  },
  {
    key: "preconcep-alcohol-tabaco",
    label: "Reducir alcohol y tabaco",
    detail:
      "Dejar el cigarrillo y el alcohol antes de concebir es de lo más beneficioso para vos y para un futuro embarazo. Pedí ayuda si te cuesta.",
    source: "OMS",
  },
  {
    key: "preconcep-cronicas",
    label: "Control de condiciones crónicas",
    detail:
      "Si tenés diabetes, hipertensión, problemas de tiroides u otra condición, conversá con tu médico/a para tenerla controlada antes de buscar embarazo.",
    source: "OMS",
  },
  {
    key: "preconcep-pareja",
    label: "Salud de ambos miembros de la pareja",
    detail:
      "La salud de ambos cuenta: hábitos, alimentación y consultas también aplican a tu pareja. La fertilidad es cosa de dos.",
    source: "OMS",
  },
];
