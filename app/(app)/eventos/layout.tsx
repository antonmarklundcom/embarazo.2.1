import type { Metadata } from "next";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Eventos",
  description:
    "Charlas, talleres y actividades para embarazadas y familias en Paraguay.",
  alternates: { canonical: "/eventos" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
