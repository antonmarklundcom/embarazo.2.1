import { DailyQuestionSchema, validateContentArray, type DailyQuestion } from "../../content/schemas";
import { publishedOnly } from "../gate";
import rawFile from "./dailyQuestions.json";

// "Pregunta del día" — one light question a day on Hoy, and how other mamás
// answered it (components/home/DailyQuestionCard.tsx, lib/poll/dailyPoll.ts).
//
// Same pattern as lib/seed/py/familyLines.ts: validated at import and again in
// `npm run validate:content`, passed through `publishedOnly()`. It lives in
// lib/seed/py/ because the questions are cultural (the madrina, polcas and
// guaranias, Guaraní at home).
//
// The list is also the server's whitelist: `/api/v1/poll` counts an answer
// only for a question id and option key published here, so the anonymous
// counter cannot be used as a free-form store. Removing a question stops new
// answers to it; its old counts stay in `contentStats` and are never read.

const file = rawFile as { lang: string; items: unknown[] };
const { valid, errors } = validateContentArray(
  "lib/seed/py/dailyQuestions.json",
  file.items,
  DailyQuestionSchema,
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/py/dailyQuestions.json:\n${errors.join("\n")}`,
  );
}

export const DAILY_QUESTIONS_LANG = file.lang;

export const PUBLISHED_DAILY_QUESTIONS: DailyQuestion[] = publishedOnly(valid);
