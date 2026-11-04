import type { Metadata } from "next";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Tus derechos",
  description:
    "Licencia por maternidad, lactancia y protección en el trabajo para la embarazada en Paraguay, explicados claro y con fuentes.",
  alternates: { canonical: "/derechos" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
