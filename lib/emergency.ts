import type { BilingualText } from "./content/schemas.ts";

// Emergency mode ("Emergencia") — national numbers + alarm signs.
// Numbers are national short codes (no department variance): 141 = SEME
// (ambulancia / emergencias médicas), 911 = emergencias en general.
// Alarm signs mirror the "señales de alarma" guía in a scannable format.

export interface EmergencyNumber {
  number: string;
  /** The service's own name. Not translated — it is what it is called. */
  name: string;
  detail: BilingualText;
}

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  {
    number: "141",
    name: "SEME · Ambulancia",
    detail: {
      es: "Emergencias médicas y traslados, las 24 horas",
      gn: "Emergencia mba'asy ha jegueraha, 24 hora",
    },
  },
  {
    number: "911",
    name: "Emergencias",
    detail: {
      es: "Policía y emergencias en general",
      gn: "Policía ha opaite emergencia",
    },
  },
];

/**
 * K19-L0 — the safety copy of `/emergencia` itself, not just its list.
 *
 * A bilingual list under a monolingual heading helps nobody: if the Guaraní
 * reader cannot read the sentence that says *what the list is for*, the
 * translated bullets underneath are decoration. So the lead, the heading and
 * the "go now" line carry Guaraní too, and all of it renders stacked.
 */
export const EMERGENCY_INTRO: BilingualText = {
  es: "Ante una señal de alarma, llamá o andá a la guardia más cercana. Esta pantalla funciona sin internet.",
  gn: "Rehecháramo peteĩ señal de alarma, ehenói térã tereho pe guardia ne mbytévape. Ko pantalla omba'apo internet'ỹre.",
};

export const ALARM_HEADING: BilingualText = {
  es: "Señales de alarma: consultá ya si tenés",
  gn: "Señales de alarma: eñeporandu pya'e oĩramo ndéve",
};

/**
 * "Cuándo ir ya al hospital." Deliberately a *routing* instruction and not a
 * new triage rule: which sign means "go" rather than "call" is a medical
 * judgement, and this batch adds language, not medicine. What it does say is
 * the thing a woman at 3 a.m. actually needs and no list states — that a phone
 * that does not answer is not a reason to wait.
 */
export const GO_NOW_LINE: BilingualText = {
  es: "Si nadie te atiende el teléfono, o el síntoma es fuerte, no esperes: andá ya a la guardia más cercana.",
  gn: "Avave nombohováiramo ne telefono, térã hasy eterei, ani reha'arõ: tereho pya'e pe guardia ne mbytévape.",
};

export interface AlarmSign {
  id: string;
  /**
   * K19-L0 — the sign itself, es-PY with its Guaraní twin. Rendered stacked
   * and always (D6), never behind the Ajustes locale toggle: this list is the
   * one a woman reads when something is already wrong.
   */
  text: BilingualText;
}

// Guaraní (jopara) versions are intentionally simple, the register used in
// MSPBS health materials. ⚠️ Pending native-speaker review before public
// launch — see DECISIONS.md.
export const ALARM_SIGNS: AlarmSign[] = [
  {
    id: "sangrado",
    text: { es: "Sangrado vaginal, en cualquier momento del embarazo", gn: "Osẽramo ndehegui tuguy, oimeraẽva árape" },
  },
  {
    id: "liquido",
    text: { es: "Pérdida de líquido por la vagina (puede ser la bolsa)", gn: "Osẽramo ndehegui y (ikatu pe bolsa)" },
  },
  {
    id: "cabeza",
    text: { es: "Dolor de cabeza fuerte que no pasa, visión borrosa o lucecitas", gn: "Ne akã rasy eterei ha nopái, térã nderechaporãi" },
  },
  {
    id: "hinchazon",
    text: { es: "Hinchazón brusca de cara, manos o pies", gn: "Iruru sapy'a nde rova, nde po térã nde py" },
  },
  {
    id: "dolor",
    text: { es: "Dolor fuerte en la panza o contracciones regulares antes de tiempo", gn: "Nde rye rasy eterei, térã contracción ou jey-jey iñora mboyve" },
  },
  {
    id: "fiebre",
    text: { es: "Fiebre de 38 °C o más", gn: "Akãnundu 38 °C térã hetave" },
  },
  {
    id: "movimientos",
    text: { es: "El bebé se mueve menos de lo habitual (3.er trimestre)", gn: "Ne memby omýi sa'ive jepivégui" },
  },
  {
    id: "vomitos",
    text: { es: "Vómitos que no paran y no te dejan retener líquidos", gn: "Eguẽ'ẽ meme ha ndaikatúi reñongatu y nde retepýpe" },
  },
  {
    id: "convulsiones",
    text: { es: "Convulsiones o pérdida de conocimiento", gn: "Convulsión térã opyta conocimiento'ỹre" },
  },
];

/**
 * Script of what to say on an emergency call, with the personal parts
 * interpolated by the UI from local data only.
 */
export const CALL_SCRIPT_STEPS: BilingualText[] = [
  {
    es: "Decí que estás embarazada y de cuántas semanas.",
    gn: "Ere nde reheve reguerekoha membykue ha mboy semanapa.",
  },
  {
    es: "Decí dónde estás: ciudad, barrio y una referencia.",
    gn: "Ere moõpa reime: távape, barrio ha peteĩ referencia.",
  },
  {
    es: "Contá qué sentís y desde cuándo.",
    gn: "Emombe'u mba'épa reñandu ha araka'e guive.",
  },
  {
    es: "Si tenés tu carné perinatal cerca, tenelo a mano.",
    gn: "Oĩramo ne carné perinatal ne ypýpe, eguereko nde pópe.",
  },
];
