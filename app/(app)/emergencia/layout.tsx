import type { Metadata } from "next";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Emergencia",
  description:
    "Números de emergencia de Paraguay, señales de alarma en el embarazo y qué decir cuando llamás. Funciona sin internet.",
  alternates: { canonical: "/emergencia" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
