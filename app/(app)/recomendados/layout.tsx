import type { Metadata } from "next";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Recomendados",
  description:
    "Recursos recomendados para acompañar tu embarazo y los primeros meses del bebé en Paraguay.",
  alternates: { canonical: "/recomendados" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
