import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  ALARM_HEADING,
  ALARM_SIGNS,
  CALL_SCRIPT_STEPS,
  EMERGENCY_INTRO,
  EMERGENCY_NUMBERS,
  GO_NOW_LINE,
} from "../lib/emergency.ts";
import { BENEFITS } from "../lib/derechos.ts";
import { CHEERS } from "../lib/sharing/cheers.ts";
import { DICT, type CoreKey } from "../lib/i18n/dict.ts";

// K19 — generate the Guaraní review sheet.
//
// Every Guaraní string in the app is hand-written and flagged pending native
// review (D6). That gate is a founder task, and a founder task needs an
// artefact somebody can actually sit down with: a reviewer cannot be handed
// four TypeScript files and a request.
//
// So this walks the four sources and writes `docs/GUARANI-REVIEW.md` — one
// table per surface, ordered by what it costs to get wrong. The file is
// committed and `lib/i18n/guaraniReview.test.ts` fails when it drifts from the
// source, for the same reason the article index is committed and pinned: a
// review sheet that silently stops matching the app is worse than none,
// because the reviewer signs off on strings that are no longer shipping.
//
// The order is deliberate. The alarm signs come first because they are read at
// 3 a.m. by someone who is already frightened; the navigation labels come last
// because a wrong one costs a moment of confusion in a calm moment.

interface Line {
  where: string;
  es: string;
  gn: string;
}

interface Section {
  title: string;
  why: string;
  lines: Line[];
}

const sections: Section[] = [
  {
    title: "1. Señales de alarma",
    why:
      "La lista que una mujer lee cuando algo ya está mal. Se muestra siempre " +
      "en los dos idiomas, sin depender de ningún ajuste. Es lo más importante " +
      "de toda esta hoja: si algo acá está mal dicho, decilo aunque el resto " +
      "quede sin revisar.",
    lines: ALARM_SIGNS.map((sign) => ({
      where: sign.id,
      es: sign.text.es,
      gn: sign.text.gn ?? "",
    })),
  },
  {
    title: "2. Pantalla de emergencia",
    why:
      "El texto alrededor de la lista: para qué sirve la pantalla, y qué hacer " +
      "si nadie contesta el teléfono. Una lista traducida bajo un título que " +
      "no se entiende no sirve de nada.",
    lines: [
      { where: "Texto de arriba", es: EMERGENCY_INTRO.es, gn: EMERGENCY_INTRO.gn ?? "" },
      { where: "Título de la lista", es: ALARM_HEADING.es, gn: ALARM_HEADING.gn ?? "" },
      { where: "Andá ya", es: GO_NOW_LINE.es, gn: GO_NOW_LINE.gn ?? "" },
      ...EMERGENCY_NUMBERS.map((entry) => ({
        where: `Número ${entry.number} (${entry.name})`,
        es: entry.detail.es,
        gn: entry.detail.gn ?? "",
      })),
    ],
  },
  {
    title: "3. Qué decir al llamar",
    why:
      "El guion que la app le muestra mientras espera que la atiendan. Se lee " +
      "en voz alta, así que importa que suene como se habla, no como se escribe.",
    lines: CALL_SCRIPT_STEPS.map((step, index) => ({
      where: `Paso ${index + 1}`,
      es: step.es,
      gn: step.gn ?? "",
    })),
  },
  {
    title: "4. Títulos de derechos",
    why:
      "Los títulos de la pantalla de derechos (licencias, permisos, IPS, " +
      "Tekoporã). El cuerpo de cada uno queda en castellano; sólo el título " +
      "lleva guaraní, que es lo que se lee al pasar la vista.",
    lines: BENEFITS.filter((benefit) => benefit.title.gn).map((benefit) => ({
      where: benefit.id,
      es: benefit.title.es,
      gn: benefit.title.gn ?? "",
    })),
  },
  {
    title: "5. Ánimos que manda la familia",
    why:
      "Frases de cariño que el papá o la familia le mandan a la mamá con un " +
      "toque. Tres de las cinco tienen guaraní: las otras dos se dejaron sin " +
      "traducir a propósito, porque una frase de cariño mal elegida cae peor " +
      "que ninguna. Si te parece que alguna de esas dos sí se dice en guaraní, " +
      "escribila.",
    lines: CHEERS.filter((cheer) => cheer.text.gn).map((cheer) => ({
      where: `${cheer.emoji} ${cheer.id}`,
      es: cheer.text.es,
      gn: cheer.text.gn ?? "",
    })),
  },
  {
    title: "6. Palabras de la app (menús y botones)",
    why:
      "Las etiquetas de navegación y los botones, que cambian cuando alguien " +
      "pone la app en guaraní desde Ajustes. Acá no hay nada de salud: es " +
      "'Hoy', 'Guardar', 'Ajustes'. Palabras prestadas como 'checklist', " +
      "'WhatsApp' o 'internet' se dejaron como se dicen — no hace falta " +
      "reemplazarlas por equivalentes inventados.",
    lines: (Object.keys(DICT.es) as CoreKey[]).map((key) => ({
      where: key,
      es: DICT.es[key],
      gn: DICT.gn[key],
    })),
  },
];

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

const total = sections.reduce((sum, section) => sum + section.lines.length, 0);

let out = `<!-- Generado por scripts/gen-guarani-review.mts — no editar a mano.
     Regenerar: npm run gen:guarani-review -->

# Guaraní — hoja de revisión

**${total} frases**, todas escritas a mano por el equipo y **ninguna revisada
todavía por una hablante nativa**. Esta hoja es para eso.

## Antes de empezar

- **El registro es jopara**, el guaraní mezclado que se habla todos los días en
  Asunción y en el interior — no guaraní académico. Si algo suena "mal escrito"
  pero es como la gente lo dice, está bien así.
- **Las palabras prestadas se dejaron a propósito**: "checklist", "WhatsApp",
  "internet", "control", "emergencia". Cambiarlas por equivalentes inventados
  daría una pantalla que nadie reconoce.
- **No hace falta traducir todo.** Si una frase no se dice en guaraní, es mejor
  dejarla en castellano que forzarla. Poné "dejar en castellano".
- **Lo que importa está arriba.** Las secciones van ordenadas por lo que cuesta
  equivocarse: las señales de alarma se leen a las 3 de la mañana; los menús,
  en un momento tranquilo.
- **Cómo marcar**: escribí la corrección en la última columna. Si está bien,
  dejala vacía o poné "ok".

`;

for (const section of sections) {
  out += `## ${section.title} — ${section.lines.length} frases\n\n${section.why}\n\n`;
  out += `| # | Dónde | Castellano | Guaraní | Corrección |\n`;
  out += `|---|---|---|---|---|\n`;
  section.lines.forEach((line, index) => {
    out += `| ${index + 1} | ${escapeCell(line.where)} | ${escapeCell(line.es)} | ${escapeCell(line.gn)} | |\n`;
  });
  out += `\n`;
}

out += `---

## Para quien reciba las correcciones

Cada sección sale de un archivo distinto:

| Sección | Archivo |
|---|---|
| Secciones 1, 2 y 3 | \`lib/emergency.ts\` |
| Sección 4 | \`lib/derechos.ts\` (sólo el campo \`title.gn\`) |
| Sección 5 | \`lib/sharing/cheers.ts\` |
| Sección 6 | \`lib/i18n/dict.ts\` (columna \`gn\`) |

Esta hoja se genera con \`npm run gen:guarani-review\` y un test falla si queda
desactualizada respecto al código. Al aplicar las correcciones, regenerala.
`;

const OUT = join(process.cwd(), "docs", "GUARANI-REVIEW.md");
let current = "";
try {
  current = readFileSync(OUT, "utf8");
} catch {
  // First run.
}

if (current === out) {
  console.log(`✓ Hoja de revisión guaraní al día (${total} frases).`);
} else {
  writeFileSync(OUT, out, "utf8");
  console.log(`✓ Hoja de revisión guaraní regenerada (${total} frases).`);
}
