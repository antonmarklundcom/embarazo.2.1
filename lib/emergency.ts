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

export const ALARM_SIGNS: AlarmSign[] = [
  { id: "sangrado", text: "Sangrado vaginal, en cualquier momento del embarazo" },
  { id: "liquido", text: "Pérdida de líquido por la vagina (puede ser la bolsa)" },
  { id: "cabeza", text: "Dolor de cabeza fuerte que no pasa, visión borrosa o lucecitas" },
  { id: "hinchazon", text: "Hinchazón brusca de cara, manos o pies" },
  { id: "dolor", text: "Dolor fuerte en la panza o contracciones regulares antes de tiempo" },
  { id: "fiebre", text: "Fiebre de 38 °C o más" },
  { id: "movimientos", text: "El bebé se mueve menos de lo habitual (3.er trimestre)" },
  { id: "vomitos", text: "Vómitos que no paran y no te dejan retener líquidos" },
  { id: "convulsiones", text: "Convulsiones o pérdida de conocimiento" },
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
