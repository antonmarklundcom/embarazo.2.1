import type { Metadata } from "next";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Directorio",
  description:
    "Lugares y servicios para el embarazo y el bebé en Paraguay, por departamento.",
  alternates: { canonical: "/directorio" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
