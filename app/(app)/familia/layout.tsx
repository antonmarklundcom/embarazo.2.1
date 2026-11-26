import type { Metadata } from "next";

import { partnerPrompt } from "@/lib/roleCopy";

// Night run item 6 — `page.tsx` here is a client component, which cannot
// export metadata, so the title, description and canonical live on this
// server wrapper.
export const metadata: Metadata = {
  title: "Familia",
  description: partnerPrompt("familiaDescription"),
  alternates: { canonical: "/familia" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
