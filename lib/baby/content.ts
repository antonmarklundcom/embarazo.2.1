// Growth plan item 9 ("Ya nació", G2) — what Hoy says in the baby's first year.
//
// Class (B) general education in the app's voice: concrete, conservative, no
// doses, nothing that tells her to wait before getting care. Every alarm sign
// ends at /emergencia. Pending medical review like the rest of the clinical
// copy (docs/decisions-needed.md, "Ya nació").
//
// The vaccine card deliberately lists no vaccines and no ages: a PAI calendar
// goes on screen only once a sourced one is in the repo (docs/YA-NACIO-PLAN.md).

import type { BabyAge } from "./age";

export interface BabyStage {
  id: "0-2" | "3-5" | "6-8" | "9-12";
  /** Completed months this stage covers, inclusive. */
  fromMonths: number;
  toMonths: number;
  /** `docs/imagery-manifest.json` → `baby`. The screen works without it. */
  image: string;
  alt: string;
}

export const BABY_STAGES: readonly BabyStage[] = [
  {
    id: "0-2",
    fromMonths: 0,
    toMonths: 2,
    image: "/assets/bebe/bebe-0-2-meses.webp",
    alt: "Ilustración: un bebé recién nacido dormido, envuelto en una manta.",
  },
  {
    id: "3-5",
    fromMonths: 3,
    toMonths: 5,
    image: "/assets/bebe/bebe-3-5-meses.webp",
    alt: "Ilustración: un bebé de pocos meses boca abajo, levantando la cabeza.",
  },
  {
    id: "6-8",
    fromMonths: 6,
    toMonths: 8,
    image: "/assets/bebe/bebe-6-8-meses.webp",
    alt: "Ilustración: un bebé sentado, probando una cucharita de puré.",
  },
  {
    id: "9-12",
    fromMonths: 9,
    toMonths: 12,
    image: "/assets/bebe/bebe-9-12-meses.webp",
    alt: "Ilustración: un bebé gateando hacia una pelota.",
  },
];

/** The stage for this age; past 12 months the last one stays. */
export function stageFor(age: BabyAge): BabyStage {
  return BABY_STAGES.find((s) => age.months >= s.fromMonths && age.months <= s.toMonths) ?? BABY_STAGES[BABY_STAGES.length - 1]!;
}

/** Feeding: exclusive breastfeeding until 6 months (WHO), then complementary food. */
export function feedingLines(age: BabyAge): string[] {
  if (age.months < 6) {
    return [
      "La OMS recomienda solo leche materna durante los primeros 6 meses: sin agua, tés ni otros alimentos.",
      "Dale el pecho cada vez que lo pida, de día y de noche. Al principio suelen ser muchas tomas por día, y es normal.",
      "Si te duele al amamantar o el bebé no se prende bien, consultá en tu servicio de salud: tiene solución y no tenés que aguantarlo.",
    ];
  }
  return [
    "Desde los 6 meses se suman otros alimentos, sin dejar el pecho: la OMS recomienda seguir con la lactancia hasta los 2 años o más.",
    "Empezá con comidas blandas (purés, papillas) y de a una cosa nueva por vez, como te indiquen en el control.",
    "Nada de miel antes del año, y ni sal ni azúcar agregadas en sus comidas.",
  ];
}

/** Safe sleep: the same at every age in the first year. */
export const SLEEP_LINES: readonly string[] = [
  "Acostalo siempre boca arriba para dormir, también en la siesta.",
  "En una superficie firme y plana, en su propia cuna, sin almohadas, peluches ni mantas sueltas.",
  "Que duerma en tu misma pieza, sobre todo los primeros 6 meses.",
  "Sin humo de cigarrillo cerca del bebé, y sin abrigarlo de más.",
];

/**
 * Alarm signs in a baby: go to a health service now. Each links to /emergencia.
 * Fever in a baby under 3 months is its own line: at that age it is always urgent.
 */
export const BABY_ALARM_SIGNS: readonly string[] = [
  "Fiebre, sobre todo si tiene menos de 3 meses, o está muy frío al tacto",
  "Le cuesta respirar: respira muy rápido, se le hunden las costillas o se pone morado",
  "No quiere tomar el pecho o vomita todo lo que toma",
  "Está muy dormido, flojito o cuesta despertarlo",
  "Piel u ojos amarillos en los primeros días, o que se extienden",
  "Convulsiones o movimientos raros que no para",
  "Pocos pañales mojados, diarrea que no para o el ombligo rojo y con mal olor",
];

export const VACCINE_LINES: readonly string[] = [
  "Llevá la libreta de vacunación a cada control y a cada visita al vacunatorio.",
  "Ahí te dicen qué vacuna le toca y cuándo. Las vacunas del PAI son gratuitas en los vacunatorios públicos.",
];

/** The existing guía, reused rather than rewritten (plan: "Trámites"). */
export const PAPERWORK_GUIDE = "/guias/despues-del-nacimiento-tramites";
