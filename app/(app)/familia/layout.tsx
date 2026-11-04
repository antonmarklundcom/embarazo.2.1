import type { Metadata } from "next";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Familia",
  description:
    "Invitá a tu pareja y a tu familia a seguir tu embarazo desde su teléfono, con lo que vos elijas compartir.",
  alternates: { canonical: "/familia" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
