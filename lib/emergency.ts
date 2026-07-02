// Emergency mode ("Emergencia") — national numbers + alarm signs.
// Numbers are national short codes (no department variance): 141 = SEME
// (ambulancia / emergencias médicas), 911 = emergencias en general.
// Alarm signs mirror the "señales de alarma" guía in a scannable format.

export interface EmergencyNumber {
  number: string;
  name: string;
  detail: string;
}

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  {
    number: "141",
    name: "SEME · Ambulancia",
    detail: "Emergencias médicas y traslados, las 24 horas",
  },
  {
    number: "911",
    name: "Emergencias",
    detail: "Policía y emergencias en general",
  },
];

export interface AlarmSign {
  id: string;
  /** es-PY text. */
  text: string;
  /** Guaraní text (optional; added with the bilingual layer). */
  textGu?: string;
}

// Guaraní (jopara) versions are intentionally simple, the register used in
// MSPBS health materials. ⚠️ Pending native-speaker review before public
// launch — see DECISIONS.md.
export const ALARM_SIGNS: AlarmSign[] = [
  {
    id: "sangrado",
    text: "Sangrado vaginal, en cualquier momento del embarazo",
    textGu: "Osẽramo ndehegui tuguy, oimeraẽva árape",
  },
  {
    id: "liquido",
    text: "Pérdida de líquido por la vagina (puede ser la bolsa)",
    textGu: "Osẽramo ndehegui y (ikatu pe bolsa)",
  },
  {
    id: "cabeza",
    text: "Dolor de cabeza fuerte que no pasa, visión borrosa o lucecitas",
    textGu: "Ne akã rasy eterei ha nopái, térã nderechaporãi",
  },
  {
    id: "hinchazon",
    text: "Hinchazón brusca de cara, manos o pies",
    textGu: "Iruru sapy'a nde rova, nde po térã nde py",
  },
  {
    id: "dolor",
    text: "Dolor fuerte en la panza o contracciones regulares antes de tiempo",
    textGu: "Nde rye rasy eterei, térã contracción ou jey-jey iñora mboyve",
  },
  {
    id: "fiebre",
    text: "Fiebre de 38 °C o más",
    textGu: "Akãnundu 38 °C térã hetave",
  },
  {
    id: "movimientos",
    text: "El bebé se mueve menos de lo habitual (3.er trimestre)",
    textGu: "Ne memby omýi sa'ive jepivégui",
  },
  {
    id: "vomitos",
    text: "Vómitos que no paran y no te dejan retener líquidos",
    textGu: "Eguẽ'ẽ meme ha ndaikatúi reñongatu y nde retepýpe",
  },
  {
    id: "convulsiones",
    text: "Convulsiones o pérdida de conocimiento",
    textGu: "Convulsión térã opyta conocimiento'ỹre",
  },
];

/**
 * Script of what to say on an emergency call, with the personal parts
 * interpolated by the UI from local data only.
 */
export const CALL_SCRIPT_STEPS: string[] = [
  "Decí que estás embarazada y de cuántas semanas.",
  "Decí dónde estás: ciudad, barrio y una referencia.",
  "Contá qué sentís y desde cuándo.",
  "Si tenés tu carné perinatal cerca, tenelo a mano.",
];
