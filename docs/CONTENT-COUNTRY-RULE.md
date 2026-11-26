# Rule: new content is tagged by country and language

In force from **26 November 2026**. Source: [BABYJOURNEY-BENCHMARK-2026-11-25.md](BABYJOURNEY-BENCHMARK-2026-11-25.md) section 5.3.

**Why.** Paraguay facts sit in about 15 modules today and Spanish text sits inside components. A second country would be a rewrite. Putting every new piece in the right place costs almost nothing now and saves that rewrite later.

**Scope.** The rule covers anything **new**: a new content file, a new fact, a new screen. Existing files stay where they are and may still be edited in place (fixing a tip in `lib/weeks.ts` is fine). Moving the old material is phase 3 of the benchmark plan, not part of this rule.

## 1. Country facts go in the country file

A country fact is anything that would be different in Bolivia or Argentina: emergency and help-line numbers, institutions (IPS, MSPBS, Registro Civil), laws and benefits, document names (libreta, carné), currency, the control schedule, the vaccine calendar, administrative divisions, prices.

- New facts go in `lib/country/py.ts`, one typed object for Paraguay. Screens read them from `lib/country` (the active country), never from a literal in a component or a general module.
- Every fact carries its official source (a URL or document name) and the date it was read. No source means `[COMPLETAR]` and a line under "Needs Anton", never a guess.
- The second country becomes `lib/country/<code>.ts` with the same type. Do not add one without Anton's yes.

## 2. Content files go in a folder that says where they are valid

New content (texts, lists, schedules, question sets) is a typed JSON file with a loader beside it, as today, in one of two folders:

| Folder | What goes there | Examples |
|---|---|---|
| `lib/seed/shared/` | True in any country. | Fetal development by week, sizes, general wellbeing, baby milestones. |
| `lib/seed/py/` | Only true, or only useful, in Paraguay. | Rights and paperwork, care at IPS or a public hospital, local foods, the PAI calendar, prices, places. |

- The file is an object with a language tag and the entries: `{ "lang": "es-PY", "items": [ ... ] }`. All Spanish in this app is written with voseo, so the tag is `es-PY` in both folders for now.
- When one piece mixes both (a week text with a universal fact and a local tip), split it into two entries with the same key, one in each folder.
- The loader keeps the existing gates: `publishedOnly()` for placeholders and `reviewedOnly()` or the approvals system for anything clinical. Call sites render only the `PUBLISHED_*` export.
- The file gets a zod schema in `lib/content/schemas.ts` and a block in `scripts/validate-content.mts`.
- No new JSON file directly under `lib/seed/`. `npm run validate:content` fails if one appears there.

## 3. New screen text goes in a message file, not in the component

- Text for a **new** screen or component lives in `lib/i18n/es-PY/<area>.ts` as a typed object of strings, and the component imports it. Small edits to an existing component may stay inline.
- A sentence that contains a country fact takes the fact from `lib/country`, so the sentence can stay the same in another country.
- `lib/i18n/dict.ts` stays what it is: the navigation and safety strings that exist in both Spanish and Guaraní. Do not put new screen text there unless a reviewed Guaraní translation comes with it.

## What a reviewer checks in a pull request

1. Is there a new Paraguay fact outside `lib/country/py.ts`?
2. Is there a new JSON file directly under `lib/seed/`?
3. Does a new component carry its own paragraphs of Spanish?

Any yes is sent back.
