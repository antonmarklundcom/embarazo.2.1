import type { Metadata } from "next";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Videos",
  description:
    "Videos cortos para acompañar tu embarazo, elegidos para Paraguay.",
  alternates: { canonical: "/guias/videos" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
