import type { Metadata } from "next";

import { WeekIndex } from "@/components/WeekIndex";

// Night run item 5 — the "Mi semana" app shortcut lands here. With a
// pregnancy on this phone it opens her current week; otherwise it is the list
// of all 42 weeks, which is also what a visitor without the app sees.

export const metadata: Metadata = {
  title: "Semana a semana",
  description:
    "El embarazo semana a semana, de la 1 a la 42: cómo crece tu bebé y qué está pasando, hecho para Paraguay.",
};

export default function SemanaIndexPage() {
  return <WeekIndex />;
}
